import React, { useState } from "react";
import axios from "axios";
import { useHistory } from "react-router-dom";

export function Login() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const history = useHistory();

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:1108/api/v1/auth", { id, password });
      const accessToken = res.data.data.accessToken;

      localStorage.setItem("accessToken", accessToken);
      history.push("/main");
    } catch (err) {
      console.error("로그인 실패:", err);
      alert("로그인 실패. 아이디 또는 비밀번호를 확인하세요.");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" }}>
      <h1 style={{ marginBottom: "30px", fontSize: "36px", color: "#333" }}>AI 학습 도우미</h1>

      <div style={{ backgroundColor: "white", padding: 30, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", width: "350px", display: "flex", flexDirection: "column", gap: 15 }}>
        <h2 style={{ textAlign: "center", marginBottom: 20 }}>로그인</h2>
        <input
          type="text"
          placeholder="아이디"
          value={id}
          onChange={(e) => setId(e.target.value)}
          onKeyDown={handleKeyPress} // 여기에 추가
          style={{ padding: "10px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ccc", outline: "none" }}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyPress} // 여기도 추가
          style={{ padding: "10px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ccc", outline: "none" }}
        />
        <button
          onClick={handleLogin}
          style={{ padding: "12px", backgroundColor: "#4CAF50", color: "white", fontWeight: "bold", fontSize: "16px", borderRadius: "8px", border: "none", cursor: "pointer" }}
        >
          로그인
        </button>
      </div>
    </div>
  );
}

export default Login;
