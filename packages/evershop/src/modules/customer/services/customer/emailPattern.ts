/**
 * The pattern with which `ILIKE` finds this e-mail address in any letter case,
 * and nothing else: `\`, `%` and `_` are written as themselves, so that an address
 * such as `jane_doe@example.com` does not also match `janexdoe@example.com`.
 *
 * An e-mail address is the same address in any letter case for the person who
 * owns it (the domain part always is, and mail servers treat the local part
 * alike), and the log in (`loginCustomerWithEmail`) has always compared it that
 * way. Every other look-up by e-mail, the unique index excepted, uses this
 * pattern to agree with it.
 */
export function emailPattern(email: string): string {
  return email.replace(/[\\%_]/g, (character) => `\\${character}`);
}
