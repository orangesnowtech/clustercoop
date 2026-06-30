/**
 * Onboarding validation — PURE, no I/O. Validates and normalizes the customer's
 * KYC profile (names, contact, NIN, BVN, bank). Nigerian formats: NIN and BVN
 * are 11 digits, bank account numbers (NUBAN) are 10 digits.
 */
import { LedgerError } from "@/lib/ledger/types";

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface ClientProfileInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  phone: string;
  address: string;
  nin: string;
  bvn: string;
  bank: BankDetails;
}

const digits = (s: string) => (s ?? "").replace(/\D/g, "");
function req(value: string, label: string): string {
  const v = (value ?? "").trim();
  if (!v) throw new LedgerError("missing_field", `${label} is required.`);
  return v;
}

export function validateOnboarding(input: ClientProfileInput): ClientProfileInput {
  const firstName = req(input.firstName, "First name");
  const lastName = req(input.lastName, "Last name");
  const middleName = (input.middleName ?? "").trim();
  const address = req(input.address, "Contact address");

  const phone = digits(input.phone);
  if (phone.length < 10 || phone.length > 15) {
    throw new LedgerError("bad_phone", "Enter a valid phone number.");
  }

  const nin = digits(input.nin);
  if (nin.length !== 11) {
    throw new LedgerError("bad_nin", "NIN must be 11 digits.");
  }
  const bvn = digits(input.bvn);
  if (bvn.length !== 11) {
    throw new LedgerError("bad_bvn", "BVN must be 11 digits.");
  }

  const bankName = req(input.bank?.bankName, "Bank name");
  const accountName = req(input.bank?.accountName, "Account name");
  const accountNumber = digits(input.bank?.accountNumber);
  if (accountNumber.length !== 10) {
    throw new LedgerError("bad_account", "Account number must be 10 digits.");
  }

  return {
    firstName,
    middleName,
    lastName,
    phone,
    address,
    nin,
    bvn,
    bank: { bankName, accountNumber, accountName },
  };
}
