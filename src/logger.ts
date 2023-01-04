import * as path from 'path';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const LOG_LEVEL = process.env.LOG_LEVEL;
const logLevel = LOG_LEVEL || 'info';

export const timestamp = () => new Date().toISOString();

const consoleTransport = new winston.transports.Console({
  colorize: true,
  level: logLevel,
  timestamp,
});

const logPath = path.join(process.cwd(), 'logs');
const rotateFileOptions = {
  filename: '%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  dirname: logPath,
  zippedArchive: true,
  maxSize: process.env.LOGGER_FILE_MAX_SIZE || '1g',
  maxFiles: process.env.LOGGER_FILE_MAX_FILES || '7d',
  level: process.env.LOGGER_FILE_LEVEL || 'info',
};

const fileTransport = new winston.transports.DailyRotateFile(rotateFileOptions);

const logger = new winston.Logger({
  transports: [consoleTransport, fileTransport],
  exceptionHandlers: [
    new winston.transports.File({
      dirname: logPath,
      filename: 'exceptions.log',
      handleExceptions: true,
      humanReadableUnhandledException: true,
      timestamp,
    }),
  ],
});

export default logger;
