import { Telegraf, Markup, session } from "telegraf";
import { NextApiRequest, NextApiResponse } from "next";
import {
  searchMovieOrTvShow,
  getMovieOrTvShowDetails,
  getWatchProviders,
  getCast,
} from "../../utils/tmdb";
import { MyContext } from "../../types/types";

const bot = new Telegraf<MyContext>(process.env.TELEGRAM_BOT_TOKEN!);

const isTextMessage = (message: any): message is { text: string } => {
  return typeof message.text === "string";
};

const generateResponseMessage = async (
  result: any,
  type: "movie" | "tv",
  locale: string
) => {
  const details = await getMovieOrTvShowDetails(result.id, type, locale);
  const cast = await getCast(result.id, type, locale);
  const watchProviders = await getWatchProviders(result.id, type, locale);

  if (!details) {
    return "Error fetching details.";
  }

  const castNames = cast.map((member) => member.name).join(", ");
  const genres = details.genres.map((genre) => genre.name).join(", ");
  const providerInfo = watchProviders || "Not available";
  const originalLanguage = details.spoken_languages
    .map((lang) => lang.english_name)
    .join(", ");

  return `
<b>Title:</b> ${details.title || details.name} (${
    details.original_title || details.original_name
  })\n
<b>Year of Release:</b> ${
    details.release_date?.split("-")[0] || details.first_air_date?.split("-")[0]
  }\n
<b>Cast:</b> ${castNames}\n
<b>Language:</b> ${originalLanguage}\n
<b>Description:</b> ${details.overview}\n
<b>IMDb Rating:</b> ${details.vote_average}\n
<b>Genres:</b> ${genres}\n
<b>OTT Information:</b>\n${providerInfo}
  `;
};

bot.use(
  session({
    defaultSession: () => ({ query: "", results: [], currentIndex: 0 }),
  })
);

bot.start(async (ctx: MyContext) =>
  ctx.reply(
    "Welcome! Send me the name of a movie or TV show and I will fetch the details for you."
  )
);

bot.on("text", async (ctx: MyContext) => {
  if (ctx.message && isTextMessage(ctx.message)) {
    const query = ctx.message.text;
    const locale = "en-IN" || "en-US";
    console.log("Locale", locale);
    const results = await searchMovieOrTvShow(query, locale);

    if (results.length === 0) {
      ctx.reply("No results found.");
      return;
    }

    ctx.session.query = query;
    ctx.session.results = results;
    ctx.session.currentIndex = 0;

    await sendResult(ctx, ctx.session.currentIndex, locale);
  } else {
    ctx.reply("Please provide a movie or TV show name.");
  }
});

bot.action(/confirm_\d+/, (ctx: MyContext) => {
  ctx.reply("Glad I could help!");
});

bot.action(/next_\d+/, async (ctx: MyContext) => {
  const match = ctx.match as RegExpExecArray; // Explicitly cast match to RegExpExecArray
  const nextIndex = parseInt(match[0].split("_")[1]);
  ctx.session.currentIndex = nextIndex;
  const locale = "en-IN" || "en-US";
  await sendResult(ctx, nextIndex, locale);
});

const sendResult = async (ctx: MyContext, index: number, locale: string) => {
  if (index >= ctx.session.results.length) {
    ctx.reply("No more results found.");
    return;
  }

  const result = ctx.session.results[index];
  const responseMessage = await generateResponseMessage(
    result,
    result.media_type,
    locale
  );

  ctx.replyWithHTML(
    responseMessage,
    Markup.inlineKeyboard([
      Markup.button.callback(
        "Is this the one you are looking for?",
        `confirm_${index}`
      ),
      Markup.button.callback("Show next result", `next_${index + 1}`),
    ])
  );
};

bot.launch();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).send("Bot is running");
}

export const config = {
  api: {
    bodyParser: false,
  },
};