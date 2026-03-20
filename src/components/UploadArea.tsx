import { useCallback, useRef, useState } from "react";

interface Props {
  onFile: (file: File) => void;
  fanCount: number | null;
}

export default function UploadArea({ onFile, fanCount }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  if (fanCount !== null) {
    return (
      <div className="upload-done">
        <span>{fanCount.toLocaleString()} fans loaded</span>
        <button onClick={() => inputRef.current?.click()}>Replace CSV</button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleChange}
          hidden
        />
      </div>
    );
  }

  return (
    <div
      className={`upload-area ${dragging ? "dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <p>Drop a CSV file here or click to upload</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleChange}
        hidden
      />
    </div>
  );
}
