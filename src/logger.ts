import * as path from 'path';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const LOG_LEVEL = process.env.LOG_LEVEL;
const logLevel = LOG_LEVEL || 'info';

export const timestamp = () => formatTimestamp(new Date());

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

const timezone = new Date().toLocaleString('en-US', { timeZoneName: 'short' }).split(' ').pop();

export const formatTimestamp = (date: Date) =>
  `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date
    .getHours()
    .toString()
    .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date
    .getMilliseconds()
    .toString()
    .padEnd(3, '0')} ${timezone}`;

export default logger;
