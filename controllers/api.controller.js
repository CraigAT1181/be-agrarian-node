const { readFile } = require("fs/promises");

exports.getEndpoints = (req, res, next) => {
  return readFile("./endpoints.json", "utf-8")
    .then((file) => {
      const endpoints = JSON.parse(file);
      res.status(200).send({ endpoints });
    })
    .catch((err) => {
      next(err);
    });
};
