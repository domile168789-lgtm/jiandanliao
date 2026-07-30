import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function TabShell() {
  return (
    <main className="phone-shell">
      <section className="h5-content-shell">
        <Outlet />
      </section>
      <nav className="tab-bar" aria-label="底部导航">
        <NavLink className={({ isActive }) => (isActive ? 'is-active' : '')} to="/h5/messages">
          消息
        </NavLink>
        <NavLink className={({ isActive }) => (isActive ? 'is-active' : '')} to="/h5/contacts">
          通讯录
        </NavLink>
        <NavLink className={({ isActive }) => (isActive ? 'is-active' : '')} to="/h5/discover">
          发现
        </NavLink>
        <NavLink className={({ isActive }) => (isActive ? 'is-active' : '')} to="/h5/me">
          我的
        </NavLink>
      </nav>
    </main>
  );
}
