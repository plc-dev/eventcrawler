const persistToDB = async (model, data) => {
    let success = false;
    try {
        await model.create(data);
        success = true;
    } catch(err) {
        updateDB(model, { eventId: data.eventId },  { status: "crawled" });
    } finally {
        return success;
    }
};

const updateDB = async (model, query, data) => {
    let success = false;
    try {
        await model.updateOne(query, data);
        success = true;
    } catch(err) {
        console.log(err);
    } finally {
        return success;
    }
};

module.exports = { updateDB, persistToDB };