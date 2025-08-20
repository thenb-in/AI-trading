import React, { useState } from "react";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

const SmartMessageRenderer = ({ content }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [modalType, setModalType] = useState("");
  const [xlsxData, setXlsxData] = useState([]);

  const isXlsx = /\.(xlsx|xls)$/i.test(content);
  const isDocx = /\.docx$/i.test(content);
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(content);
  const isTxt = /\.txt$/i.test(content);
  const isPdf = /\.pdf$/i.test(content);
  const isUrl = /^https?:\/\/[^\s]+$/.test(content);
  const isVideo = /\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i.test(content);
  const isAudio = /\.(mp3|wav|ogg|aac|flac|m4a|wma)$/i.test(content);

  const closeModal = () => {
    setShowModal(false);
    setModalContent("");
    setModalType("");
    setXlsxData([]);
  };

  const handleImageClick = () => {
    setModalContent(content);
    setModalType("image");
    setShowModal(true);
  };

  const handleTextClick = async () => {
    try {
      const response = await fetch(content);
      const text = await response.text();
      setModalContent(text);
      setModalType("text");
      setShowModal(true);
    } catch (err) {
      setModalContent("Failed to load text file.");
      setModalType("text");
      setShowModal(true);
    }
  };

  const handlePdfClick = () => {
    setModalContent(content);
    setModalType("pdf");
    setShowModal(true);
  };

  const handleXlsxClick = async () => {
    try {
      const response = await fetch(content);
      const data = await response.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      setXlsxData(json);
      setModalType("xlsx");
      setShowModal(true);
    } catch (err) {
      setXlsxData([["Failed to load Excel file."]]);
      setModalType("xlsx");
      setShowModal(true);
    }
  };

  const handleDocxClick = async () => {
    try {
      const response = await fetch(content);
      const arrayBuffer = await response.arrayBuffer();
      const { value } = await mammoth.convertToHtml({ arrayBuffer });
      setModalContent(value);
      setModalType("docx");
      setShowModal(true);
    } catch {
      setModalContent("<p>Failed to load DOCX file.</p>");
      setModalType("docx");
      setShowModal(true);
    }
  };

  const handleUrlClick = () => {
    setModalContent(content);
    setModalType("url");
    setShowModal(true);
  };

  const renderModalContent = () => {
    switch (modalType) {
      case "image":
        return (
          <div className="flex items-center justify-center h-full">
            <img
              src={modalContent}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded"
            />
          </div>
        );

      case "text":
        return (
          <div className="h-full overflow-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 p-4 bg-gray-50 rounded">
              {modalContent}
            </pre>
          </div>
        );

      case "pdf":
        return (
          <div className="h-full">
            <iframe
              src={modalContent}
              className="w-full h-full border-0 rounded"
              title="PDF Preview"
            />
          </div>
        );

      case "xlsx":
        return (
          <div className="h-full overflow-auto">
            <table className="table-auto w-full border border-collapse">
              <tbody>
                {xlsxData.map((row, i) => (
                  <tr key={i} className={i === 0 ? "bg-gray-100" : ""}>
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className="border px-3 py-2 text-sm text-gray-700"
                      >
                        {cell || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "docx":
        return (
          <div className="h-full overflow-auto">
            <div
              className="prose prose-sm max-w-full p-4"
              dangerouslySetInnerHTML={{ __html: modalContent }}
            />
          </div>
        );

      case "url":
        return (
          <div className="h-full">
            <iframe
              src={modalContent}
              className="w-full h-full border-0 rounded"
              title="Website Preview"
            />
          </div>
        );

      default:
        return <div>Loading...</div>;
    }
  };

  // Video Player - Direct playback
  if (isVideo) {
    return (
      <video
        controls
        className="w-64 rounded-lg"
        preload="metadata"
      >
        <source src={content} />
        Your browser does not support the video tag.
      </video>
    );
  }

  // Audio Player - Direct playback  
  if (isAudio) {
    return (
      <audio
        controls
        className="max-w-64 max-w-md"
        preload="metadata"
      >
        <source src={content} />
        Your browser does not support the audio tag.
      </audio>
    );
  }

  // Render file type indicators
  if (isImage) {
    return (
      <>
        <div
          onClick={handleImageClick}
          className=" cursor-pointer rounded-lg bg-white shadow-sm hover:shadow-md transition p-2 flex flex-col items-center"
        >
          <img
            src={content}
            alt="thumbnail"
            className="w-64 h-64 object-cover rounded-lg mb-2"
          />
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-800">
              Image File
            </div>
            <div className="text-xs text-gray-500 mt-1">Click to preview</div>
          </div>
        </div>

        {renderModal()}
      </>
    );
  }

  if (isTxt) {
    return (
      <>
        <div
          onClick={handleTextClick}
          className="flex items-center gap-3 border p-3 rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
        >
          <div className="w-10 h-10 flex items-center justify-center rounded bg-blue-100 text-blue-700 font-bold text-xs">
            TXT
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Text File</div>
            <div className="text-xs text-gray-500">Click to preview</div>
          </div>
        </div>
        {renderModal()}
      </>
    );
  }

  if (isPdf) {
    return (
      <>
        <div
          onClick={handlePdfClick}
          className="flex items-center gap-3 border p-3 rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
        >
          <div className="w-10 h-10 flex items-center justify-center rounded bg-red-100 text-red-700 font-bold text-xs">
            PDF
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">PDF File</div>
            <div className="text-xs text-gray-500">Click to preview</div>
          </div>
        </div>
        {renderModal()}
      </>
    );
  }

  if (isDocx) {
    return (
      <>
        <div
          onClick={handleDocxClick}
          className="flex items-center gap-3 border p-3 rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
        >
          <div className="w-10 h-10 flex items-center justify-center rounded bg-blue-100 text-blue-700 font-bold text-xs">
            DOCX
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Word Document</div>
            <div className="text-xs text-gray-500">Click to preview</div>
          </div>
        </div>
        {renderModal()}
      </>
    );
  }

  if (isXlsx) {
    return (
      <>
        <div
          onClick={handleXlsxClick}
          className="flex items-center gap-3 border p-3 rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
        >
          <div className="w-10 h-10 flex items-center justify-center rounded bg-green-100 text-green-700 font-bold text-xs">
            XLSX
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Excel File</div>
            <div className="text-xs text-gray-500">Click to preview</div>
          </div>
        </div>
        {renderModal()}
      </>
    );
  }

  if (isUrl) {
    return (
      <>
        <div
          onClick={handleUrlClick}
          className="flex items-center gap-3 border p-3 rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
        >
          <div className="w-10 h-10 flex items-center justify-center rounded bg-purple-100 text-purple-700 font-bold text-xs">
            URL
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Website Link</div>
            <div className="text-xs text-gray-500">Click to preview</div>
          </div>
        </div>
        {renderModal()}
      </>
    );
  }

  // Function to render the modal
  function renderModal() {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white w-[95vw] h-[95vh] rounded-lg shadow-2xl relative overflow-hidden">
          {/* Header with close button */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800 capitalize">
              {modalType} Preview
            </h3>
            <button
              onClick={closeModal}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 text-xl font-bold transition-colors"
              title="Close"
            >
              ×
            </button>
          </div>

          {/* Content area */}
          <div className="p-4 h-[calc(100%-4rem)] overflow-hidden">
            {renderModalContent()}
          </div>
        </div>
      </div>
    );
  }

  // Default case - plain text
  return <p className="text-sm text-gray-800 whitespace-pre-wrap">{content}</p>;
};

export default SmartMessageRenderer;
