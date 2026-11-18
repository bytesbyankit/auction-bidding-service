import { z } from "zod";
import { SYSTEM_DEFAULTS } from "../constants";

const currencyRegex = new RegExp(`^\\d+(\\.\\d{1,${SYSTEM_DEFAULTS.CURRENCY_MAX_DECIMALS}})?$`);

export const currencyAmountSchema = z
  .number({
    invalid_type_error: "Amount must be a number",
    required_error: "Amount is required"
  })
  .positive("Amount must be greater than 0")
  .finite("Amount must be a finite number")
  .refine(
    (val) => currencyRegex.test(val.toString()),
    `Amount cannot have more than ${SYSTEM_DEFAULTS.CURRENCY_MAX_DECIMALS} decimal places`
  );

