# Anis – Docker DB Download

Docker mein chal rahe Postgres databases ka data ek click mein download karne ka chhota program.

- Sirf Docker se baat karta hai (`docker ps`, `docker exec`). Main project ke kisi code se juda nahi hai.
- Koi npm package nahi chahiye, sirf Node.js (22 ya naya) aur Docker Desktop.
- Main project ke saath apne aap start nahi hota: jab chahiye tab khud chalao.
- Sirf `127.0.0.1` pe sunta hai, network pe koi aur ise nahi khol sakta.
- Koi password nahi chahiye: container ke andar uske apne `POSTGRES_USER` se `pg_dump` / `psql` chalta hai.

## Start / Stop

- **Start:** `start.bat` pe double-click. Browser mein http://127.0.0.1:4700 khulega.
  (Ya terminal mein: `node server.js`)
- **Stop:** "Anis - Docker DB Download" wali black window band kar do.
- Port badalna ho: `set ANIS_PORT=4800` karke `node server.js`.

## Kya download hota hai

| Button | File |
|---|---|
| Download SQL | Poora database ek `.sql` file mein (structure + data). Wapas banane ke liye: `psql -f file.sql` |
| Download all tables (CSV .zip) | Har table ki ek `.csv`, sab ek `.zip` mein (Excel mein khulti hain) |
| Table ke aage "CSV" | Sirf us table ki `.csv` |

Options: "INSERT lines" se SQL padhne mein aasaan hota hai; "Sirf data" se tables ka structure nahi aata.

Files browser ke **Downloads** folder mein aati hain, naam mein database aur samay hota hai,
jaise `ctw_2026-10-22_1530.sql`.

**Dhyan rakho:** downloads mein asli data hota hai (users ke password hash bhi). Inhe kisi ke saath share mat karo.
