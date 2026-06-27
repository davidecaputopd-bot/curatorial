import Parser from 'rss-parser'

const parser = new Parser()

export async function fetchFeed(rssUrl: string) {
  try {
    const feed = await parser.parseURL(rssUrl)
    return feed.items.slice(0, 10)
  } catch (error) {
    console.error(`Errore fetch ${rssUrl}:`, error)
    return []
  }
}