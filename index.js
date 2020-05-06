require("dotenv").config();
const puppeteer = require("puppeteer");
const { facebookEventCrawler } = require("./eventCrawler");
const { updateDB, persistToDB } = require("./database/dbOperations");

const mergeEntities = scrapedEvent => {
    const { descriptionEntities, bottomEntities, topEntities } = scrapedEvent;
    let mergedEntities = [];
    if (topEntities != null) {
        const taggedNames = topEntities.map(entity => entity.name);
        mergedEntities = [ descriptionEntities, bottomEntities ].filter(e => e != null).reduce((merged, entity) => {
            if (!taggedNames.includes(entity.name)) {
                merged = [ ...merged, { ...merged, tag: null } ];
            }
            return merged;
        }, topEntities);
    }
    return mergedEntities;
};

const manageCrawler = async (eventIds, db) => {
    const browser = await puppeteer.launch();
    try {
        let i = 0;
        let eventIdsCopy = JSON.parse(JSON.stringify(eventIds));
        while (i < Object.keys(eventIdsCopy).length) {
            const currentEventId = Object.keys(eventIdsCopy)[i];
            const scrapedEvent = await facebookEventCrawler(browser, currentEventId);
            if (scrapedEvent != null) {
                const newEvents = scrapedEvent.newEvents;
                delete scrapedEvent.newEvents;
                eventIdsCopy = await newEvents
                    .filter(e => !eventIds.hasOwnProperty(e.id))
                    .reduce(async (eventIds, e) => {
                        await persistToDB(db.EventIds, {
                            eventId: e.id, 
                            eventLink: e.link, 
                            status: "uncrawled"
                        });

                        return { ...eventIds, [e.id]: e.id }
                    }, eventIdsCopy);
                await updateDB(
                    db.EventIds, 
                    { eventId: currentEventId },
                    { status: "crawled" });
                
                scrapedEvent.mergedEntities = await mergeEntities(scrapedEvent);

                await persistToDB(db.Events, {
                    eventId: currentEventId,
                    eventTitle: scrapedEvent.title,
                    eventDescription: scrapedEvent.description,
                    entities: scrapedEvent.mergedEntities
                });
            } else {
                await updateDB(
                    db.EventIds, 
                    { eventId: currentEventId },
                    { status: "error" });
            }
            i++;
            console.log(currentEventId)
        };
    } catch(e) {
        console.log(e)
    } finally {
        await browser.close()
        return;
    }
};

(async function main() {
    const mdb = await require("./database/mongooseDAO")();
    const models = mdb.models;
    const events = await models.EventIds.find({status: { $eq: "uncrawled" }})
    let eventIdMap = events.reduce((map, event) => ({...map, [event.eventId]: event.eventId }), {});

    if (!Object.keys(eventIdMap).length) {
        eventIdMap = {"272249427275412": "272249427275412"}
    }

    // initialization
    // const eventIdMap = {"272249427275412": "272249427275412"}

    await manageCrawler(eventIdMap, models );
})();
