# Add nano AI to your app

Nano AI is just a search fallback. You search like normal first. If you get nothing, Woozlit turns the query into a title, then you search again with that.

Get a Woozlit API key and keep it on your backend. Never put it in the frontend. Only call Woozlit when the first search is empty.

Flow: query, your search, if empty then woozlit, then title, then your search again, then results.

Test it:

```js
fetch("https://api.woozlit.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: "Bearer YOUR_KEY_HERE",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "shio",
    max_tokens: 30,
    messages: [{ role: "user", content: "say hi" }],
  }),
})
  .then((r) => r.json())
  .then((d) => console.log(d.choices[0].message.content))
```

Search fallback:

```js
function search(q, yourSearch) {
  return yourSearch(q).then((r) => {
    if (r.results && r.results.length) return r

    return fetch("https://api.woozlit.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer YOUR_KEY_HERE",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "shio",
        max_tokens: 30,
        messages: [{
          role: "user",
          content: "Turn this into one movie/tv title. Reply only as [RESULT]title[/RESULT]\n\n" + q,
        }],
      }),
    })
      .then((x) => x.json())
      .then((ai) => {
        const text = (ai.choices && ai.choices[0] && ai.choices[0].message && ai.choices[0].message.content) || ""
        const m = text.match(/\[RESULT\](.*?)\[\/RESULT\]/i)
        const title = m && m[1] ? m[1].trim() : ""
        return title ? yourSearch(title) : r
      })
  })
}
```

`yourSearch` is whatever search you already have.

The ghost pet on nano is separate. Same Woozlit API, just short cute replies for the bubble.
