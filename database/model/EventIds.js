module.exports = mongoose => {
  const EventIds = new mongoose.Schema({
    eventId: {
      type: String,
      required: true,
      unique: true
    },
    eventLink: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true
    },
    errorMessage: {
      type: String
    }
  });
  return mongoose.model("EventIds", EventIds);
};
