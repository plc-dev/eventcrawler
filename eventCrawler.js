const crawlNewEvents = async page => {
    let newEvents = null;
    try {
        await page.waitFor(() => !!document.querySelector('#event_related_events a[aria-hidden="true"]'));
        newEvents = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#event_related_events a[aria-hidden="true"]'))
                .map(e => {
                    const match = e.href.match(/events\/([0-9]*?)\//); 
                    const id = match ? e.href.match(/events\/([0-9]*?)\//)[1] : null;
                    const link = e.href;
                    return { id, link };
                });
        });
    } catch (e) {
        console.log(e);
        console.log(`new events: ${eventId}`);
        newEvents = null;
    } finally {
        return newEvents;
    }
}

const crawlEventTitle = async page => {
    let eventTitle = null;
    try {
        await page.waitFor(() => !!document.querySelector('#seo_h1_tag'));
        eventTitle = await page.$eval('#seo_h1_tag', el => el.textContent);
    } catch (e) {
        console.log(e);
        console.log(`event title: ${eventId}`);
        eventTitle = null
    } finally {
        return eventTitle;
    }
}

const crawlEventDescription = async page => {
    let eventBody = null;
    try {
        await page.waitFor(() => !!document.querySelector('#reaction_units [id] div div div div span'));
        eventBody = await page.$eval('#reaction_units [id] div div div div span', el => 
            ({ text: el.textContent, entities: Array.from(el.querySelectorAll('a')).map(e => {
                name = e.textContent;
                link = e.href;
                return { name, link };
            }) }) );
    } catch (e) {
        console.log(e);
        console.log(`event description: ${eventId}`);
        eventBody = null;
    } finally {
        return eventBody;
    }
}

const crawlBottomEntities = async page => {
    let bottomHosts = null;
    try {
        // hosts below event description
        await page.waitFor(() => !!document.querySelector('.uiList li a[aria-hidden="true"]'));
        bottomHosts = await page.evaluate(() => 
            Array.from(document.querySelectorAll('.uiList li a[aria-hidden="true"]')).map(e => {
                name = e.parentNode.textContent;
                link = e.href;
                return { name, link };
            })
        );
    } catch (e) {
        console.log(e);
        console.log(`bottom entities: ${eventId}`);
        bottomHosts = null;
    } finally {
        return bottomHosts;
    }
}

const crawlTopEntities = async page => {
    let titleHosts = null;
    try {
        // hosts next to title
        await page.waitFor(() => !!document.querySelector('[data-testid="event_permalink_feature_line"]'));
        if (await page.evaluate(() => document.querySelectorAll('[data-testid="event_permalink_feature_line"] a').length) > 1 
            && await page.evaluate(() => /weitere Personen/.test(document.querySelector('[data-testid="event_permalink_feature_line"] a:last-child'))) ) {
            await page.click('[data-testid="event_permalink_feature_line"] a:last-child');
            await page.waitFor(() => !!document.querySelector('.profileBrowserDialog .uiList'));
            titleHosts = await page.evaluate(() => 
                Array.from(document.querySelectorAll('.profileBrowserDialog .uiList .fbProfileBrowserListItem'))
                    .map(e => {
                        name = e.querySelector('.uiProfileBlockContent a').textContent;
                        tag = e.textContent.substring(name.length);
                        link = e.querySelector('.uiProfileBlockContent a').href;
                        return { name, tag, link };
                    })
                );
        } else if (await page.evaluate(() => document.querySelectorAll('[data-testid="event_permalink_feature_line"] a').length) > 1) {
            titleHosts = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('[data-testid="event_permalink_feature_line"] a')).map(host => {
                    name = host.textContent;
                    link = host.href;
                    return [{ name, tag: null, link }];
                });
            });
        } else {
            titleHosts = await page.evaluate(() => {
                name = document.querySelector('[data-testid="event_permalink_feature_line"] a').textContent
                link = document.querySelector('[data-testid="event_permalink_feature_line"] a').href
                return [{ name, tag: null, link }];
            });
        }
    } catch (e) {
        console.log(e);
        console.log(`top entities: ${eventId}`);
        titleHosts = null;
    } finally {
        return titleHosts;
    }
}

const facebookEventCrawler = async (browser, eventId) => {
    let event = null;
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    try {
        const url = `https://www.facebook.com/events/${eventId}/`;
        await page.goto(url);

        const newEvents = await crawlNewEvents(page);
        const eventTitle = await crawlEventTitle(page)
        const eventBody = await crawlEventDescription(page);
        const bottomHosts = await crawlBottomEntities(page);
        const titleHosts = await crawlTopEntities(page);

        if (eventBody != null) {
            event = { 
                newEvents, 
                title:                  eventTitle, 
                description:            eventBody.text,
                descriptionEntities:    eventBody ? eventBody.entities : null,
                bottomEntities:         bottomHosts,
                topEntities:            titleHosts
            };
        }
    } catch (e) {
        console.log(e);
        event = null;
    } finally {
        await page.goto('about:blank');
        await page.close();
        return event;
    }
}

module.exports = { facebookEventCrawler };