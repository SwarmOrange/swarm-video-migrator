/*******************************
 * [log.js]
 * Unified logging entry-point for the application
 *
 ******************************/

class Logger {
  constructor() {}

  log(level, message, error) {
    switch (level) {
      case "info":
        //ⓘ
        console.info(`ℹ️\tINFO: ${message}`);
        break;
      case "warning":
        //⚠
        console.warn(`\n⚠️\tWARNING: ${message}\n`);
        break;

      case "success":
        console.info(`\n🎉\tSUCCESS: ${message}\t🎉`);
        break;

      case "exception":
        // Used for times when you do not want the application to throw
        console.warn(`\n❌\tEXCEPTION: ${message}\t❌`);
        console.warn(error || "No full error provided");
        break;

      default:
        console.log(message);
        break;
    }
  }
}

module.exports = Logger;
