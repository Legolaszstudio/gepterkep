# GépTérkép

Eredeti célja, hogy számítógépeket lehessen elhelyezni egy térképen, majd vissza keresni.

DE tulajdonképpen bármit rá lehet helyezni vele képekre.

Elérhető itt: [gepterkep.novy.vip](https://gepterkep.novy.vip)

### Technológiák:

- [Fabric.js](http://fabricjs.com/)
- [React](http://reactjs.org)
- [Swal2](https://sweetalert2.github.io/)

## Build process

```
Frontend config fájl szerkesztése -> ./src/config.js
Frontend buildelése -> npm run build
Frontend kód másolása public mappába -> cp ./build ./backend/public (maps mappát ne bántsuk)

Backend szerver telepítése (cd backend) -> npm install
Backend szerver config fájl szerkesztése -> ./backend/src/config.js
Backend szerver futattása -> npm start
```