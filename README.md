# Crinspire - Exam Simulator Platform

A comprehensive exam simulation platform built with React, TypeScript, and Supabase. Features include timed exams, multiple question types (MCQ, MSQ, NAT), premium subscription management, and detailed performance analytics.

## 🚀 Features

- **Multiple Exam Types**: Support for MCQ, MSQ (Multiple Select), and NAT (Numerical Answer Type) questions
- **Admin Panel**: Create and manage exams with rich question editor
- **Premium Subscriptions**: Integrated Razorpay payment gateway with 1-month and 6-month plans
- **Performance Analytics**: Detailed breakdown by sections and categories
- **24-Hour Solution Review**: Students can review detailed solutions for 24 hours after submission
- **Streak Tracking**: Daily practice streak system to encourage consistency
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Razorpay account (for payment processing)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd routing-crinspire-exam-simulator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your credentials:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon/public key
   - `VITE_RAZORPAY_KEY_ID`: Your Razorpay key ID

4. **Set up Supabase Database**

   Run the following SQL files in your Supabase SQL Editor (in order):
   
   a. Main schema:
   ```bash
   supabase/schema.sql
   ```
   
   b. Exam submissions table (for 24h review):
   ```bash
   supabase/exam_submissions.sql
   ```
   
   c. Deploy Supabase Edge Functions:
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Deploy functions
   supabase functions deploy create-order
   supabase functions deploy verify-payment
   ```

5. **Configure Razorpay Webhooks** (Optional but recommended)
   - Go to Razorpay Dashboard → Webhooks
   - Add webhook URL: `<your-supabase-url>/functions/v1/verify-payment`
   - Subscribe to `payment.captured` event

## 🚀 Running the App

### Development Mode
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

### Production Build
```bash
npm run build
npm run preview
```

## 📦 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

### Other Platforms
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: Add all variables from `.env.example`

## 🔐 Admin Access

To set up admin users:

1. Go to Supabase Dashboard → SQL Editor
2. Run:
   ```sql
   INSERT INTO public.admin_whitelist (email, user_id)
   VALUES ('admin@example.com', '<user-uuid>');
   ```

Admin users can:
- Create and edit exams
- Delete exams
- View all user submissions
- Manage question banks

## 📊 Database Structure

Key tables:
- `profiles`: User information and subscription status
- `papers`: Exam papers with metadata
- `questions`: Individual questions with options and correct answers
- `user_attempts`: Exam attempt history for analytics
- `exam_submissions`: Detailed submission data for 24h review
- `admin_whitelist`: Admin user permissions

## 🎨 Tech Stack

- **Frontend**: React 19 + TypeScript
- **Routing**: React Router v7
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Payments**: Razorpay
- **Build Tool**: Vite
- **Styling**: Tailwind CSS utility classes
- **Icons**: Lucide React

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software. All rights reserved.

## 🐛 Troubleshooting

### Common Issues:

**"Failed to fetch exams"**
- Check Supabase URL and keys in `.env.local`
- Verify RLS policies are enabled
- Check browser console for specific errors

**"Payment verification failed"**
- Ensure Razorpay keys are correct
- Verify Edge Functions are deployed
- Check function logs in Supabase dashboard

**"No result data found"**
- Ensure `exam_submissions.sql` migration is run
- Check that user has completed an exam
- Results expire after 24 hours

## 📧 Support

For issues and questions, please open an issue in the GitHub repository.

---

Made with ❤️ by the Crinspire Team
