cat << 'INNER_EOF' > update_recording.ts
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          try {
            setLoadingVoice(true);
            setTranscript("Transcribing...");
            const res = await api.transcribeAudio(base64Audio);
            setTranscript(res.text);
          } catch (e) {
            setToast('Failed to transcribe audio.');
            setTranscript("");
          } finally {
            setLoadingVoice(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscript('');
    } catch (e: any) {
      console.error("Microphone error", e);
      setToast("Microphone access denied. Please allow microphone permissions in your browser.");
      setTimeout(() => setToast(''), 4000);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };
INNER_EOF
