import OctopusComponent from "@/components/SpeechToIndex";
// import VoiceWidget from "@/components/VoiceActivation";
import React from "react";

const Pico = () => {
  return <div>
    <div className="pt-40">
    {/* <VoiceWidget/> */}
    <p>Sandbox</p>
    <div className="mt-10">
    <OctopusComponent/>
    </div>
    
    </div>
  </div>;
};

export default Pico;
