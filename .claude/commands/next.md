30 days. Open my next day and coach me through it.

1. Run `node mw.js next`. If it says the 30 days are not started or open after task 4.3, tell me exactly that and stop. If it says all days are done, congratulate me in one line and stop.
2. For each item not yet done (⬜): say in 2 lines what to do, then do it with me.
   - "do" items happen in my own repo (show the diff and ask before editing anything there).
   - "read" items: open the linked page or card and ask me one question about it.
   - "share" items: draft the one line I will post in the WhatsApp group.
3. After each item, run `node mw.js done <itemId>`.
4. When `mw done` says the day is done and the next one is open, ask me whether to go on now or stop for today. There are no dates: either is fine.

Keep it to about 20 minutes a day. Short replies. Never put code, file contents or paths into any mw command.
