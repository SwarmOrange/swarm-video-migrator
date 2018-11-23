/*******************************
 * [log.js]
 * Unified logging entry-point for the application
 *
 ******************************/

class Logger {
  constructor(dependencies) {
    this.dependencies = dependencies;
  }

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

  //@TODO: This is a test, should be put in config and logged to the /usr/producer (or consumer)/logs dir.
  persist(level, message) {
    const { fs } = this.dependencies;
    const stream = fs.createWriteStream(`${level}.txt`, { flags: "a" });

    this.log("info", "Persisting a message...");

    stream.write(
      `\r\n---${level.toUpperCase()} @ ${new Date(Date.now())}---\r\n`
    );
    stream.write(message.toString());
  }
}

module.exports = Logger;
