# Menuto: меню за заведения

Един сайт, много заведения. `/raffi` и `/happy` показват различни менюта, а всеки собственик управлява само своето от `/admin`.

## Стартиране
1. Firebase Console: нов проект, включи **Authentication** (Email/Password) и **Firestore**.
2. В Project settings добави Web app и копирай данните в `.env` (по образец `.env.example`).
3. Firestore, раздел Rules: постави съдържанието на `firestore.rules` и натисни Publish.
4. `npm install`, после `npm run dev`.
5. Отвори `/admin`, регистрирай се, създай заведение и добави ястия. Менюто е на `/<адрес>`.

## Публикуване
`npm run build`, после качи папката `dist` (Firebase Hosting, Netlify, Vercel). Задай пренасочване на всички пътища към `index.html` (single-page app), иначе `/raffi` ще дава 404 при директно отваряне.
