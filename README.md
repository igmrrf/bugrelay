# BUGMIRROR

**BUGMIRROR** is an open platform where users can report bugs they find in any application, and companies can claim ownership to manage and resolve them.  
The goal is to make public bug tracking transparent, community-driven, and company-verifiable.

---

## 🚀 Features
- Public bug submission and browsing
- Company claiming and verification via domain email
- Bug upvoting and discussion threads
- Company dashboard for managing bugs and updates
- Admin moderation tools (spam, duplicates, flags)

---

## 🧱 Tech Stack
**Frontend:** Next.js 15 (React, TailwindCSS, Shadcn/UI)  
**Backend:** NestJS (Node.js + TypeScript)  
**Database:** PostgreSQL (Prisma ORM)  
**Auth:** Clerk / NextAuth / Supabase Auth  
**Storage:** AWS S3 / Supabase Storage  
**Hosting:** Vercel + Railway or Render  

---

## 🛠️ Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/bugmirror.git
   cd bugmirror
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and set environment variables:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/bugmirror
   NEXTAUTH_SECRET=your-secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Start development servers:
   ```bash
   npm run dev
   ```

6. Access the app at `http://localhost:3000`

---

## 🤝 Contributing
Please read [`CONTRIBUTE.md`](./CONTRIBUTE.md) before submitting PRs.

---

## 📜 License
This project is licensed under the MIT License - see the [`LICENSE.md`](./LICENSE.md) file for details.

