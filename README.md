# Star Speller

Star Speller is a gamified English vocabulary builder designed for elementary students. It leverages AI to generate engaging word data, images, and validation, making the learning process interactive and fun.

## 🌟 Features

- **AI-Powered Learning**: Uses Google Gemini to generate word definitions, example sentences, and contextual images.
- **Gamified Experience**: Earn stars and badges as you progress. Features a "Rhythm Beat" to keep the learning pace exciting.
- **Voice Interaction**: Includes microphone support for pronunciation practice and speech-to-text validation.
- **Multi-User Support**: Create different profiles with password protection to track individual progress.
- **Comprehensive Stats**: Track daily performance, including stars earned, badges, and learning time.
- **Word Library**: Review past words and manage your learning history.
- **Offline-First**: Uses IndexedDB for local data persistence, ensuring your progress is saved even without a constant connection.

## 🚀 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **AI Integration**: @google/genai (Gemini API)
- **Icons**: Lucide React (via SVG)
- **Animations**: Custom CSS animations and transitions
- **Storage**: IndexedDB (via custom service)

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd star-speller
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 📁 Project Structure

- `/src`: Main source code
  - `/components`: Reusable UI components (TopBar, BottomNav, MicrophoneButton, etc.)
  - `/pages`: Main application views (Home, Library, Stats)
  - `/services`: Core logic (Gemini AI, Database, Audio)
  - `/utils`: Helper utilities (Encryption, Sanitization)
- `/types.ts`: Global TypeScript definitions
- `/metadata.json`: Application metadata and permissions

## 📝 Usage

1. **Login/Register**: Create a new user profile or log in to an existing one.
2. **Start Learning**: The app will present words to learn. Use the "Speaker" button to hear the word and the "Microphone" to practice pronunciation.
3. **Review**: Visit the Library page to review words you've already encountered.
4. **Track Progress**: Check the Stats page to see your daily achievements and badges.

## 🔒 Security

- User passwords are encrypted locally before storage.
- API keys are managed via environment variables.

## 📄 License

This project is licensed under the MIT License.
