import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import WebInfo from './pages/WebInfo'
import Quiz from './pages/Quiz'
import EssayPractice from './pages/EssayPractice'
import RolePractice from './pages/RolePractice'
import EmpathyPractice from './pages/EmpathyPractice'
import './index.css'

export default function App() {
  return (
    <BrowserRouter basename="/CareerConsultant-">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="web-info" element={<WebInfo />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="essay" element={<EssayPractice />} />
          <Route path="roleplay" element={<RolePractice />} />
          <Route path="empathy" element={<EmpathyPractice />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
