import { Request, Response } from "express";
import { AuctionService } from "./auction.service";
import {
  OUTCOME_CODES,
  STREAM_EVENTS,
  PAGINATION,
  StatusCodes,
  SYSTEM_DEFAULTS
} from "../../constants";
import { ApiResponse } from "../../utils/api-response";

export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  createAuction = async (req: Request, res: Response): Promise<Response> => {
    const auction = await this.auctionService.createAuction(req.body);
    return ApiResponse.success(res, {
      statusCode: StatusCodes.CREATED,
      data: auction
    });
  };

  getAuction = async (req: Request, res: Response): Promise<Response> => {
    const id = req.params.id as string;
    const limit = Number(req.query.limit) || PAGINATION.DEFAULT_LIMIT;
    const offset = Number(req.query.offset) || PAGINATION.DEFAULT_OFFSET;

    const result = await this.auctionService.getAuctionWithBids(id, { limit, offset });

    if (!result) {
      return ApiResponse.error(res, {
        statusCode: StatusCodes.NOT_FOUND,
        code: OUTCOME_CODES.AUCTION_NOT_FOUND,
        message: `Auction with id '${id}' not found.`
      });
    }

    return ApiResponse.success(res, {
      statusCode: StatusCodes.OK,
      data: result
    });
  };

  streamAuction = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

    const auction = await this.auctionService.getAuctionById(id);
    if (!auction) {
      ApiResponse.error(res, {
        statusCode: StatusCodes.NOT_FOUND,
        code: OUTCOME_CODES.AUCTION_NOT_FOUND,
        message: `Auction with id '${id}' not found.`
      });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    res.write(
      `event: ${STREAM_EVENTS.CONNECTED}\ndata: ${JSON.stringify({
        auction_id: id,
        message: "Connected to live auction changefeed stream"
      })}\n\n`
    );

    const unsubscribe = await this.auctionService.subscribeToLiveAuction(
      id,
      (event) => {
        res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
      },
      (err) => {
        res.write(`event: ${STREAM_EVENTS.ERROR}\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
      }
    );

    if (!unsubscribe) {
      res.end();
      return;
    }

    const heartbeat = setInterval(() => {
      res.write(": keep-alive\n\n");
    }, SYSTEM_DEFAULTS.SSE_HEARTBEAT_INTERVAL_MS);

    req.on("close", async () => {
      clearInterval(heartbeat);
      await unsubscribe();
    });
  };
}
