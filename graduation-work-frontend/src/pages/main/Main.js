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

  const [textsPerPage, setTextsPerPage] = useState([]);
  const [quizzes, setQuizzes] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [aiHelperOn, setAiHelperOn] = useState(true);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [userQuestion, setUserQuestion] = useState("");

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
        // alert("업로드 성공!");
        fetchPdfList(selectedSubject.id);
      } catch (err) {
        console.error("업로드 실패:", err);
        alert("업로드 실패");
      }
    };
    fileInput.click();
  };

  const handlePdfClick = async (filename) => {
    setPdfInstance(null);
    setFile(null);
    setSelectedFileName(null);
    setTextsPerPage([]);
    setShowQuiz(false);
    setQuizzes(null);
    setGeneratingQuiz(false);
    setPageNumber(1);
    setExplanation("");

    try {
      const res = await axios.get(`/uploads/${filename}`, { responseType: "blob" });
      const newFileUrl = URL.createObjectURL(res.data);
      setFile(newFileUrl);
      setSelectedFileName(filename);
    } catch (error) {
      console.error("PDF 로드 실패:", error);
      alert("PDF 파일을 불러오는 데 실패했습니다.");
    }
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
            { role: "system", content: "당신은 학생에게 교안을 쉽게 설명해주는 도우미입니다." },
            { role: "user", content: `아래 [] 안 텍스트를 보고 한국어로 존댓말로 쉽게 설명해주세요: [${text}]` },
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
      setExplanation("GPT 응답 실패");
    } finally {
      setLoadingExplanation(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const extractTextFromPage = async () => {
      if (!pdfInstance || typeof pdfInstance.getPage !== "function" || !pageNumber) return;
      try {
        const page = await pdfInstance.getPage(pageNumber);
        if (cancelled) return;
        const content = await page.getTextContent();
        if (cancelled) return;
        const strings = content.items.map((item) => item.str);
        const text = strings.join(" ");

        setTextsPerPage((prev) => {
          const updated = [...prev];
          updated[pageNumber - 1] = text;
          return updated;
        });

        if (aiHelperOn) {
          explainTextWithGPT(text);
        }
      } catch (err) {
        console.error("extractTextFromPage error:", err);
      }
    };

    extractTextFromPage();

    return () => {
      cancelled = true;
    };
  }, [pdfInstance, pageNumber]);


  const handleNextPage = async () => {
    if (pageNumber < numPages) {
      setPageNumber((p) => p + 1);
    } else {
      const allText = textsPerPage.join(" ");
      setGeneratingQuiz(true);
      await generateQuizFromText(allText);
    }
  };

  async function generateQuizFromText(text) {
    const prompt = `[${text}] [] 안에 있는 텍스트를 기반으로 4개의 문제를 만들어주세요. 
    문제는 반드시 텍스트 내용 안에서 답을 그대로 찾을 수 있는 물음형 문제여야 합니다. 
  답변은 반드시 JSON.stringify()를 적용한 JSON 배열만 출력하세요. 
  형식은 다음과 같아야 합니다: 
  [
    {
      "question": "문제1",
      "hint": "힌트1",
      "options": ["옵션1", "옵션2", "옵션3", "옵션4", "옵션5"],
      "answer_number": "1"
    },
    {
      "question": "문제2",
      "hint": "힌트2",
      "options": ["옵션1", "옵션2", "옵션3", "옵션4", "옵션5"],
      "answer_number": "2"
    },
    ...
  ]
  규칙:
  - options 배열은 반드시 5개 요소여야 합니다.
  - answer_number는 "1"~"5" 문자열이어야 합니다.
  - JSON 배열 외에는 다른 문장 추가 없이 순수 JSON만 출력하세요.`;

    setGeneratingQuiz(true);

    while (true) {
      try {
        const res = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "당신은 반드시 JSON.stringify()된 순수 JSON 배열만 출력해야 합니다." },
              { role: "user", content: prompt },
            ],
            max_tokens: 1000,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        const content = res.data.choices[0].message.content.trim();

        const parsedQuizzes = JSON.parse(content);

        if (parsedQuizzes.length !== 4 || parsedQuizzes.some(q => !q.options || q.options.length !== 5)) {
          console.warn("퀴즈 포맷 이상. 다시 요청합니다.");
          continue;
        }

        setSelectedAnswers({});
        setIsSubmitted(false);
        setQuizzes(parsedQuizzes);
        setShowQuiz(true);
        break;
      } catch (err) {
        console.error("퀴즈 생성 실패. 0.1초 후 재시도.", err);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setGeneratingQuiz(false);
  }




  const handleSelectOption = (quizIdx, optionIdx) => {
    setSelectedAnswers(prev => ({ ...prev, [quizIdx]: optionIdx }));
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitted(true);

    let correct = 0;
    const solvedQuizData = quizzes.map((q, idx) => {
      const selectedNum = (selectedAnswers[idx] ?? -1) + 1;
      if (selectedAnswers[idx] === parseInt(q.answer_number) - 1) {
        correct++;
      }
      return {
        question: q.question,
        hint: q.hint,
        options: JSON.stringify(q.options),
        answer_number: q.answer_number,
        selected_number: selectedNum,
        subject_id: selectedSubject?.id,
      };
    });

    alert(`총 ${quizzes.length}문제 중 ${correct}개 맞았습니다!`);

    try {
      await axios.post('/api/v1/saveQuizResult', solvedQuizData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log('퀴즈 결과 저장 성공');
    } catch (error) {
      console.error('퀴즈 결과 저장 실패', error);
      alert('서버에 푼 문제 저장 실패했습니다.');
      return;
    }

    const updatedQuizzes = quizzes.map((q, idx) => ({
      ...q,
      selected_number: (selectedAnswers[idx] ?? -1) + 1,
    }));
    setQuizzes(updatedQuizzes);

    setIsSubmitted(true);
  };


  const handleWrongNoteClick = async () => {
    if (!selectedSubject) {
      alert("과목을 먼저 선택해주세요.");
      return;
    }

    try {
      const res = await axios.get(`/api/v1/wrongNote/${selectedSubject.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const wrongNotes = res.data;

      console.log(wrongNotes)

      const parsedQuizzes = wrongNotes.map(item => ({
        question: item.question,
        hint: item.hint,
        options: JSON.parse(item.options),
        answer_number: item.answer_number,
        selected_number: item.selected_number,
      }));

      setQuizzes(parsedQuizzes);
      setSelectedAnswers({});
      setShowQuiz(true);
      setIsSubmitted(true);
    } catch (error) {
      console.error("오답노트 불러오기 실패:", error);
      alert("오답노트를 불러오지 못했습니다.");
    }
  };

  const handleSendAdditionalQuestion = async () => {
    if (!userQuestion.trim()) {
      alert("질문을 입력하세요.");
      return;
    }

    setShowQuestionModal(false);
    setLoadingExplanation(true);

    const allText = textsPerPage.join(" ");

    try {
      const res = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "당신은 학생에게 교안을 쉽게 설명해주는 도우미입니다." },
            { role: "user", content: `다음 학습자료를 참고해서 질문에 답해주세요.\n\n[${allText}]\n\n질문: ${userQuestion}` },
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
      console.error("추가 질문 실패:", error);
      setExplanation("GPT 응답 실패");
    } finally {
      setLoadingExplanation(false);
      setUserQuestion("");
    }
  };


  return (
    <div style={{ height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", fontSize: "17px" }}>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, backgroundColor: "#f8f9fa", fontFamily: "Arial, sans-serif" }}>
        {/* 상단 - 과목 선택, 업로드 버튼 */}
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
                  setShowQuiz(false);
                  setQuizzes(null);
                }
              }}
              style={{ padding: "10px 15px", borderRadius: "12px", border: "1px solid #ccc", fontSize: "16px", backgroundColor: "#fff", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", cursor: "pointer", minWidth: "180px" }}
            >
              {subjectList.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
            <button onClick={handleUploadClick} style={{ border: "none", borderRadius: 12, backgroundColor: "#4CAF50", color: "white", padding: "10px 20px", cursor: "pointer" }}>PDF 업로드</button>
            <button
              onClick={handleWrongNoteClick}
              style={{ border: "none", borderRadius: 12, backgroundColor: "#f44336", color: "white", padding: "10px 20px", cursor: "pointer" }}
            >
              오답노트
            </button>
          </div>
          <div style={{ backgroundColor: "#e0f7fa", borderRadius: 12, padding: 10, flexGrow: 1, textAlign: "center", fontWeight: "bold", color: "#00796b" }}>
            ChatGPT와 함께 강의 교안을 학습해보세요.
          </div>
          <div
            onClick={() => setAiHelperOn(prev => !prev)}
            style={{
              width: "100px",
              height: "36px",
              backgroundColor: aiHelperOn ? "#ff9800" : "#9e9e9e",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 8px 0 14px",
              cursor: "pointer",
              position: "relative",
              transition: "background-color 0.3s ease",
              boxSizing: "border-box",
              fontWeight: "bold",
              fontSize: "14px",
              color: "white",
            }}
          >
            <div style={{ whiteSpace: "nowrap" }}>
              {aiHelperOn ? "AI ON" : "AI OFF"}
            </div>
            <div
              style={{
                width: "20px",
                height: "20px",
                backgroundColor: "white",
                borderRadius: "50%",
                transform: aiHelperOn ? "translateX(0)" : "translateX(-6px)",
                transition: "transform 0.3s ease",
              }}
            />
          </div>

          <button onClick={() => setShowQuestionModal(true)} style={{ border: "none", borderRadius: 12, backgroundColor: "#2196F3", color: "white", padding: "10px 20px", cursor: "pointer" }}>
            추가 질문
          </button>
        </div>

        {/* 본문 - 왼쪽 PDF목록 / 중앙 PDF or 퀴즈 / 오른쪽 AI도우미 */}
        <div style={{ display: "flex", flex: 1, gap: 10 }}>
          {/* 왼쪽 PDF 목록 */}
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

          {/* 중앙 PDF 뷰어 or 퀴즈 */}
          <div style={{ width: "55%", backgroundColor: "#fff", borderRadius: 12, padding: 10, display: "flex", justifyContent: "center", alignItems: "center", position: "relative", overflowY: "auto", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            {generatingQuiz ? (
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", gap: "20px" }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#00796b" }}>
                  퀴즈 생성 중...
                </div>
                <div className="spinner" style={{ width: 30, height: 30, border: "4px solid #ccc", borderTop: "4px solid #00796b", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              </div>
            ) : showQuiz && quizzes ? (
              <div style={{ flex: 1, width: "100%", maxHeight: "90vh", overflowY: "auto", paddingRight: "10px" }}>
                {quizzes.map((q, idx) => (
                  <div key={idx} style={{ marginBottom: 30 }}>
                    <div style={{ fontWeight: "bold" }}>{idx + 1}. {q.question}</div>
                    <div style={{ color: "gray", marginBottom: 5 }}>힌트: {q.hint}</div>
                    {q.options.map((opt, optIdx) => {
                      const correctAnswerIdx = parseInt(q.answer_number) - 1;
                      const wrongSelectedIdx = q.selected_number - 1;

                      let borderColor = "#ccc";
                      let backgroundColor = "#fff";

                      if (isSubmitted) {
                        if (optIdx === correctAnswerIdx) {
                          backgroundColor = "#e8f5e9";
                          borderColor = "#4CAF50";
                        }
                        if (optIdx === wrongSelectedIdx && wrongSelectedIdx !== correctAnswerIdx) {
                          backgroundColor = "#ffebee";
                          borderColor = "#f44336";
                        }
                      } else if (selectedAnswers[idx] === optIdx) {
                        backgroundColor = "#e8f5e9";
                        borderColor = "#4CAF50";
                      }

                      return (
                        <label
                          key={optIdx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            margin: "8px 0",
                            cursor: isSubmitted ? "default" : "pointer",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: `2px solid ${borderColor}`,
                            backgroundColor,
                            transition: "all 0.2s",
                          }}
                        >
                          <input
                            type="radio"
                            name={`quiz-${idx}`}
                            value={optIdx}
                            checked={selectedAnswers[idx] === optIdx}
                            onChange={() => handleSelectOption(idx, optIdx)}
                            style={{ marginRight: 10 }}
                            disabled={isSubmitted}
                          />
                          {opt}
                        </label>
                      );
                    })}

                  </div>
                ))}
              </div>
            ) : file ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", width: "100%" }}>
                {/* 왼쪽 화살표 */}
                <div
                  onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 40,
                    cursor: "pointer",
                    userSelect: "none",
                    padding: "10px",
                  }}
                >
                  ⬅️
                </div>

                {/* PDF 페이지 */}
                <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
                  <Page pageNumber={pageNumber} width={700} />
                </Document>

                {/* 오른쪽 화살표 */}
                <div
                  onClick={handleNextPage}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 40,
                    cursor: "pointer",
                    userSelect: "none",
                    padding: "10px",
                  }}
                >
                  ➡️
                </div>
              </div>
            ) : (
              <div style={{ color: "#aaa", fontStyle: "italic" }}>PDF를 선택해주세요.</div>
            )}
          </div>

          {/* 오른쪽 AI 도우미 or 퀴즈 제출 버튼 */}
          <div style={{ width: "30%", backgroundColor: "#fff", borderRadius: 12, padding: 10, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            {(!generatingQuiz && !showQuiz) && (
              <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                🤖 AI 도우미
              </div>
            )}
            {generatingQuiz ? (
              <div></div>
            ) : showQuiz && quizzes ? (
              <button
                onClick={isSubmitted ? undefined : handleSubmitQuiz}
                style={{ width: "100%", padding: "15px", backgroundColor: isSubmitted ? "#f44336" : "#4CAF50", color: "white", fontSize: "18px", borderRadius: "12px", border: "none", cursor: "pointer" }}
              >
                {isSubmitted ? "오답노트를 확인하고 다시 복습해보세요." : "제출하기"}
              </button>
            ) : (
              <>
                {aiHelperOn ? (
                  loadingExplanation ? (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                      <div className="spinner" style={{ width: 30, height: 30, border: "4px solid #ccc", borderTop: "4px solid #00796b", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    </div>
                  ) : (
                    <div style={{ whiteSpace: "pre-wrap", fontSize: 17, color: "#333" }}>{explanation}</div>
                  )
                ) : (
                  <div style={{ color: "#aaa", fontSize: "17px", textAlign: "center", marginTop: "20px" }}>AI 도우미 (OFF)</div>
                )}
              </>
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
      {showQuestionModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "30px 25px",
            borderRadius: "16px",
            width: "420px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            animation: "fadeIn 0.3s ease",
          }}>
            <h2 style={{ margin: "0 0 20px 0", textAlign: "center", fontSize: "22px", color: "#333" }}>
              추가 질문하기
            </h2>
            <textarea
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder="궁금한 점을 입력해주세요."
              style={{
                width: "100%",
                height: "120px",
                padding: "12px",
                fontSize: "16px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                resize: "none",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={() => setShowQuestionModal(false)}
                style={{
                  padding: "10px 16px",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  backgroundColor: "white",
                  color: "#333",
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={handleSendAdditionalQuestion}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  fontSize: "15px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                보내기
              </button>
            </div>
          </div>

          <style>{`
      @keyframes fadeIn {
        0% { opacity: 0; transform: scale(0.9); }
        100% { opacity: 1; transform: scale(1); }
      }
    `}</style>
        </div>
      )}


    </div>
  );
}

export default Main;
