import EventEmitter from 'events';

class DashboardLogger extends EventEmitter {
  private static instance: DashboardLogger;
  private logs: string[] = [];
  private maxLogs = 500;

  private constructor() {
    super();
    this.interceptConsole();
  }

  public static getInstance(): DashboardLogger {
    if (!DashboardLogger.instance) {
      DashboardLogger.instance = new DashboardLogger();
    }
    return DashboardLogger.instance;
  }

  private interceptConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      const msg = this.format('INFO', args);
      this.addLog(msg);
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      const msg = this.format('ERROR', args);
      this.addLog(msg);
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const msg = this.format('WARN', args);
      this.addLog(msg);
      originalLog.apply(console, args);
    };
  }

  private format(level: string, args: any[]): string {
    const timestamp = new Date().toLocaleTimeString();
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    return `[${timestamp}] [${level}] ${message}`;
  }

  private addLog(msg: string) {
    this.logs.push(msg);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.emit('log', msg);
  }

  public getRecentLogs(): string[] {
    return this.logs;
  }
}

export const logger = DashboardLogger.getInstance();
