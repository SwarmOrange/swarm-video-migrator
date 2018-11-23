/*******************************
 * [io.js]
 * File system interaction
 *
 ******************************/

class IO {
  constructor(dependencies) {
    this.dependencies = dependencies;
  }

  loadFile(filePath, callback) {
    const { magic, fs } = this.dependencies;

    magic.detectFile(filePath, (err, fileType) => {
      if (err) throw err;

      fs.readFile(filePath, (err, data) => {
        if (err) throw err;

        callback(data, fileType);
      });
    });
  }

  // files & folders
  delete(path, callback) {
    const { rimraf, logger } = this.dependencies;

    rimraf(path, err => {
      if (err) throw new Error(err);

      logger.log("info", "Old file deleted");

      callback();
    });

    /*
    fs.remove(path, err => {
      if (err) throw new Error(err);

      logger.log("info", "Old file deleted");

      callback();
    });
    */
  }

  moveFile(oldPath, newPath, callback) {
    const { fs, logger } = this.dependencies;

    fs.copy(oldPath, newPath, err => {
      if (err) throw new Error(err);

      logger.log("info", "File copied");

      this.delete(oldPath, callback);
    });
  }
}

module.exports = IO;
