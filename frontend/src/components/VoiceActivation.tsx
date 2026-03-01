// /* eslint-disable @typescript-eslint/no-explicit-any */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// "use client";
// import useMuteStore from "../store/muteStore";

// import React, { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { FiMic, FiMicOff } from "react-icons/fi";
// import { useAppContext, usePathContext } from "@/app/AppContext";
// import UploadModal from "./UploadModal";
// import { toast } from "react-toastify";
// import stringSimilarity from "string-similarity";

// function VoiceWidget() {
//   const { voiceSearchText, setVoiceSearchText } = useAppContext();
//   const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
//   const [isListening, setIsListening] = useState(true);
//   const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
//   const [hasWelcomed, setHasWelcomed] = useState(false);
//   const { mute, toggleMute } = useMuteStore();
//   useEffect(() => {
//     if (mute) {
//       window.speechSynthesis.cancel();
//     }
//   }, [mute]);
//   const { viewName, setViewName, filesContext, setFilesContext } =
//     usePathContext();
//   const router = useRouter();

//   const commands = [
//     "confirm",
//     "decline",
//     "go to directory",
//     "search documents for",
//     "upload file",
//     "open",
//   ];

//   // Text-to-Speech helper function
//   const speak = (message: string) => {
//     const synth = window.speechSynthesis;
//     const utterance = new SpeechSynthesisUtterance(message);
//     utterance.lang = "en-IS";
//     synth.speak(utterance);
//   };

//   useEffect(() => {
//     const welcomed = sessionStorage.getItem("hasWelcomed");
//     if (!welcomed) {
//       setHasWelcomed(false);
//       sessionStorage.setItem("hasWelcomed", "true");
//     }
//   }, []);

//   useEffect(() => {
//     const handleSpaceKey = (event: KeyboardEvent) => {
//       if (
//         event.code === "Space" &&
//         (event.target === document.body || event.target === document)
//       ) {
//         event.preventDefault(); // Prevent scrolling
//         handleMicClick();
//       }
//     };

//     document.addEventListener("keydown", handleSpaceKey);

//     return () => {
//       document.removeEventListener("keydown", handleSpaceKey);
//     };
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [recognition, isListening]);

//   useEffect(() => {
//     const SpeechRecognition =
//       (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

//     if (SpeechRecognition) {
//       const recognitionInstance = new SpeechRecognition();
//       recognitionInstance.continuous = false;
//       recognitionInstance.interimResults = false;
//       recognitionInstance.lang = "en-US";

//       recognitionInstance.onstart = () => {
//         setIsListening(true);
//       };

//       recognitionInstance.onend = () => {
//         setIsListening(false);
//       };

//       recognitionInstance.onerror = (event: any) => {
//         console.error("Speech recognition error:", event.error);
//         setIsListening(false);
//       };

//       recognitionInstance.onresult = (event: any) => {
//         let transcript = event.results[0][0].transcript;
//         console.log("Transcript:", transcript);
//         transcript = transcript.replace(/ dot /g, ".");
//         const lowerTranscript = transcript.toLowerCase();

//         // Match user command with string similarity
//         const bestMatch = stringSimilarity.findBestMatch(lowerTranscript, commands);
//         const matchedCommand = bestMatch.bestMatch.target;

//         console.log(`Matched Command: ${matchedCommand} (Score: ${bestMatch.bestMatch.rating})`);

//         if (!hasWelcomed) {
//           if (matchedCommand === "confirm") {
//             speak(
//               "Thank you. You can say 'Go to directory' to navigate to the directory."
//             );
//           } else if (matchedCommand === "decline") {
//             speak("Alright. Let us know if you need any assistance.");
//           } else {
//             speak(`You said: ${transcript}. Moving on.`);
//           }
//           setHasWelcomed(true);
//         } else {
//           if (matchedCommand === "go to directory") {
//             speak("Navigating to the directory.");
//             router.push("/directory");
//             setTimeout(() => {
//               console.log(
//                 "Files in current directory:",
//                 filesContext.filter((file) => !file.fileName.endsWith("/"))
//               );
//               speak(
//                 "In the directory, you can say 'open' followed by a file name to open that file. Or, say 'upload file' to upload a new file."
//               );
//             }, 3000);
//           } else if (matchedCommand === "search documents for") {
//             const searchText = lowerTranscript
//               .replace("search documents for ", "")
//               .trim();
//             setVoiceSearchText(searchText);
//             speak(`Searching documents for ${searchText}.`);
//             router.push("/directory");
//           } else if (matchedCommand === "upload file") {
//             speak("Opening the upload modal.");
//             setIsUploadModalOpen(true);
//           } else if (matchedCommand === "open") {
//             const fileNameQuery = lowerTranscript.replace("open", "").trim();

//             // Find the closest matching file name
//             const fileNames = filesContext.map((file) => file.fileName);
//             const bestFileMatch = stringSimilarity.findBestMatch(
//               fileNameQuery,
//               fileNames
//             );

//             if (bestFileMatch.bestMatch.rating > 0.5) { // Ensure a good match
//               const matchedFileName = bestFileMatch.bestMatch.target;
//               console.log(`File to open: ${matchedFileName}`);
//               speak(`Opening ${matchedFileName}.`);
//               setViewName(matchedFileName);
//             } else {
//               speak("Sorry, I couldn't find a file matching your request.");
//             }
//           } else {
//             speak(`You said: ${transcript}. Command not recognized.`);
//           }
//         }
//       };

//       setRecognition(recognitionInstance);

//       if (!hasWelcomed) {
//         speak(
//           "Welcome to Transformo Docs. If you are visually impaired, please say 'confirm.'. Otherwise, say 'decline.'."
//         );
//         recognitionInstance.start();
//       }
//     } else {
//       toast.error("Speech Recognition not supported in this browser.");
//     }
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [hasWelcomed, setVoiceSearchText, filesContext]);

//   const handleMicClick = () => {
//     if (!isListening && recognition) {
//       speak("Hey");
//       recognition.start();
//     } else if (recognition) {
//       recognition.stop();
//     }
//   };

//   return (
//     <div>
//       {/* Mic Widget */}
//       <div
//         className="fixed bottom-4 right-4 flex items-center justify-center w-14 h-14 bg-blue-500 rounded-full shadow-lg cursor-pointer hover:bg-blue-600"
//         title={isListening ? "Listening..." : "Not Listening"}
//         onClick={handleMicClick}
//       >
//         {isListening ? (
//           <FiMic className="text-white w-6 h-6" />
//         ) : (
//           <FiMicOff className="text-white w-6 h-6" />
//         )}
//       </div>

//       {/* Upload File Modal */}
//       <UploadModal
//         openModal={isUploadModalOpen}
//         currentPath="~/Sandbox"
//         showButton={false}
//       />
//     </div>
//   );
// }

// export default VoiceWidget;