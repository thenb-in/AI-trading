// Strip ANSI escape sequences (color codes, cursor moves) so log files
// stay readable when we tee child-process output into them.
export function stripAnsiCodes(input: string): string {
  return input.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
}
