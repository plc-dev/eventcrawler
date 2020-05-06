module.exports = async () => {
  try {
    const mongoose = require("mongoose");

    // manual configuration due to deprecation of collection.ensureIndex
    mongoose.set("useCreateIndex", true);
    mongoose.set("useFindAndModify", false);

    // Setup Connection
    await mongoose.connect(process.env.mongooseConnection, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Add all models to one object for better accessibility
    const db = mongoose;
    db.models.EventIds = require("./model/EventIds")(mongoose);
    db.models.Events = require("./model/Events")(mongoose);

    console.log(`Mongoose initialized!`);

    return db;
  } catch (err) {
    console.log(err);
  }
};
