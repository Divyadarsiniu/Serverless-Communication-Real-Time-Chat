import React from 'react';
import Navbar from '../components/Navbar';
import UserList from '../components/UserList';
import ChatWindow from '../components/ChatWindow';
import DevPanel from '../components/DevPanel';

export default function ChatPage() {
  return (
    <div className="app-container">
      <Navbar />
      <div className="main-content">
        <UserList />
        <ChatWindow />
      </div>
      <DevPanel />
    </div>
  );
}
