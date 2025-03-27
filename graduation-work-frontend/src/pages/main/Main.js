import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf/dist/esm/entry.webpack";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import axios from "axios";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
axios.defaults.baseURL = "http://localhost:1108";

export function Main() {
  const [file, setFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfInstance, setPdfInstance] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [pdfList, setPdfList] = useState([]);
  const [subjectList, setSubjectList] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  localStorage.setItem("accessToken", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjowLCJpZCI6MSwiaWF0IjoxNzQyOTY2NjQ4LCJleHAiOjE3NzQ1MjQyNDh9.U5XuEAOCDi9dyy2nxs0J1CCDNbl9XnupCH8hmD24Mhw");
  const accessToken = localStorage.getItem("accessToken");

  useEffect(() => {
    const fetchSubjectsAndPdfs = async () => {
      try {
        const subjectRes = await axios.get("/api/v1/subjectList", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const subjects = subjectRes.data.subjects;
        setSubjectList(subjects);

        const savedSubjectId = localStorage.getItem("selectedSubjectId");
        const initialSubject = savedSubjectId
          ? subjects.find((s) => s.id === parseInt(savedSubjectId))
          : subjects[0];

        if (initialSubject) {
          setSelectedSubject(initialSubject);
          localStorage.setItem("selectedSubjectId", initialSubject.id);
          fetchPdfList(initialSubject.id);
        }
      } catch (err) {
        console.error("과목 불러오기 실패:", err);
      }
    };
    fetchSubjectsAndPdfs();
  }, []);

  const fetchPdfList = async (subjectId) => {
    try {
      const res = await axios.get(`/api/v1/pdfList/${subjectId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setPdfList(res.data.pdfs);
    } catch (error) {
      console.error("PDF 목록 불러오기 실패:", error);
    }
  };

  const handleUploadClick = async () => {
    if (!selectedSubject) return alert("과목이 선택되지 않았습니다.");

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".pdf";
    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("subjectId", selectedSubject.id);

      try {
        await axios.post("/api/v1/uploadPdf", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        alert("업로드 성공!");
        fetchPdfList(selectedSubject.id);
      } catch (err) {
        console.error("업로드 실패:", err);
        alert("업로드 실패");
      }
    };
    fileInput.click();
  };

  const handlePdfClick = (filename) => {
    axios.get(`/uploads/${filename}`, { responseType: "blob" }).then((res) => {
      setFile(URL.createObjectURL(res.data));
      setSelectedFileName(filename);
    });
  };

  const onDocumentLoadSuccess = (pdf) => {
    setNumPages(pdf.numPages);
    setPageNumber(1);
    setPdfInstance(pdf);
  };

  const explainTextWithGPT = async (text) => {
    try {
      setLoadingExplanation(true);
      const res = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "너는 학생에게 교안을 쉽게 설명해주는 도우미야.",
            },
            {
              role: "user",
              content: `아래 [] 안 텍스트를 보고 모든 내용에 대해 한국어로 설명을 해줘. 예 같은 대답은 하지 말고 존댓말로 설명만 해줘: [${text}]`,
            },
          ],
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      const result = res.data.choices[0].message.content;
      setExplanation(result);
    } catch (error) {
      console.error("GPT 요청 실패:", error);
      setExplanation("GPT 응답을 불러오는 데 실패했습니다.");
    } finally {
      setLoadingExplanation(false);
    }
  };

  useEffect(() => {
    const extractTextFromPage = async () => {
      if (pdfInstance && pageNumber) {
        const page = await pdfInstance.getPage(pageNumber);
        const content = await page.getTextContent();
        const strings = content.items.map((item) => item.str);
        const text = strings.join(" ");
        explainTextWithGPT(text);
      }
    };
    extractTextFromPage();
  }, [pdfInstance, pageNumber]);

  return (
    <div style={{ height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", fontSize: "17px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, backgroundColor: "#f8f9fa", fontFamily: "Arial, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 10 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={selectedSubject?.id || ''}
              onChange={(e) => {
                const subject = subjectList.find(s => s.id === parseInt(e.target.value));
                setSelectedSubject(subject);
                if (subject) {
                  localStorage.setItem("selectedSubjectId", subject.id);
                  fetchPdfList(subject.id);
                  setFile(null);
                  setSelectedFileName(null);
                  setPdfInstance(null);
                  setNumPages(null);
                  setPageNumber(1);
                  setExplanation("");
                }
              }}
              style={{ padding: "10px 15px", borderRadius: "12px", border: "1px solid #ccc", fontSize: "16px", backgroundColor: "#fff", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", cursor: "pointer", minWidth: "180px" }}
            >
              {subjectList.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
            <button onClick={handleUploadClick} style={{ border: "none", borderRadius: 12, backgroundColor: "#4CAF50", color: "white", padding: "10px 20px", cursor: "pointer" }}>PDF 업로드</button>
          </div>
          <div style={{ backgroundColor: "#e0f7fa", borderRadius: 12, padding: 10, flexGrow: 1, textAlign: "center", fontWeight: "bold", color: "#00796b" }}>
            ChatGPT와 함께 강의 교안을 학습해보세요.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ border: "none", borderRadius: 12, backgroundColor: "#ff9800", color: "white", padding: "10px 20px" }}>AI 도우미 ON/OFF</button>
            <button style={{ border: "none", borderRadius: 12, backgroundColor: "#2196F3", color: "white", padding: "10px 20px" }}>추가 질문</button>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, gap: 10 }}>
          <div style={{ width: "15%", backgroundColor: "#fff", borderRadius: 12, padding: 10, overflowY: "auto", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <div style={{ fontWeight: "bold", marginBottom: 10 }}>📁 PDF 목록</div>
            {pdfList.length === 0 ? (
              <div style={{ color: "#999", fontStyle: "italic", paddingTop: 10 }}>PDF를 추가해보세요.</div>
            ) : (
              pdfList.map((pdf, index) => (
                <div
                  key={index}
                  onClick={() => handlePdfClick(pdf.filename)}
                  style={{
                    padding: "8px 0",
                    cursor: "pointer",
                    borderBottom: "1px solid #eee",
                    color: selectedFileName === pdf.filename ? "#1976d2" : "#000",
                    fontWeight: selectedFileName === pdf.filename ? "bold" : "normal",
                    backgroundColor: selectedFileName === pdf.filename ? "#e3f2fd" : "transparent"
                  }}
                >
                  {pdf.original_name}
                </div>
              ))
            )}
          </div>

          <div style={{ width: "55%", backgroundColor: "#fff", borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", position: "relative" }}>
            <div style={{ fontWeight: "bold", marginBottom: 10 }}>Page {pageNumber} / {numPages}</div>
            <div style={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
              {file ? (
                <Document file={file} onLoadSuccess={onDocumentLoadSuccess} loading="PDF 불러오는 중...">
                  <Page pageNumber={pageNumber} width={700} />
                </Document>
              ) : (
                <div style={{ color: "#aaa", fontStyle: "italic" }}>PDF를 선택해주세요.</div>
              )}
              <div onClick={() => setPageNumber((p) => Math.max(p - 1, 1))} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 30, cursor: "pointer" }}>⬅️</div>
              <div onClick={() => setPageNumber((p) => Math.min(p + 1, numPages))} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 30, cursor: "pointer" }}>➡️</div>
            </div>
          </div>

          <div style={{ width: "30%", backgroundColor: "#fff", borderRadius: 12, padding: 10, overflowY: loadingExplanation ? "hidden" : "auto", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <div style={{ fontWeight: "bold", marginBottom: 10 }}>🤖 AI 도우미</div>
            {file ? (
              loadingExplanation ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", minHeight: 200 }}>
                  <div className="spinner" style={{ width: 30, height: 30, border: "4px solid #ccc", borderTop: "4px solid #00796b", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                </div>
              ) : (
                <div style={{ whiteSpace: "pre-wrap", fontSize: 17, color: "#333" }}>{explanation}</div>
              )
            ) : (
              <div style={{ color: "#aaa", fontStyle: "italic" }}>PDF를 선택해주세요.</div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

export default Main;
