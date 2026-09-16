// Thermal-printer integration point. Swap the body of `print` for a real
// ESC/POS driver (e.g. `node-thermal-printer`) pointed at each printer's
// IP once hardware is on site — kitchen ticket printer, waiter-copy
// printer, and the register's receipt printer are three separate targets.

export type PrintTarget = "kitchen" | "waiter_copy" | "receipt";

export interface PrintJob {
  target: PrintTarget;
  lines: string[];
}

export async function print(job: PrintJob): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[print:${job.target}]`, job.lines.join("\n"));
}
