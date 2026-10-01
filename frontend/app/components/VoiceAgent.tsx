"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Activity, Loader2, Sparkles } from 'lucide-react';
import { API_URL } from '../config';

type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface TranscriptMsg {
    role: 'user' | 'assistant';
    text: string;
}

interface ToolEvent {
    tool: string;
    status: string;
}

export const VoiceAgent = () => {
    // State
    const [isConnected, setIsConnected] = useState(false);
    const [agentState, setAgentState] = useState<AgentState>('idle');
    const [transcript, setTranscript] = useState<TranscriptMsg[]>([]);
    const [activeTool, setActiveTool] = useState<ToolEvent | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const nextPlayTimeRef = useRef<number>(0);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll transcript
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcript]);

    const connect = async () => {
        try {
            setErrorMsg(null);
            
            // 1. Setup AudioContext & Mic
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = stream;
            
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContext({ sampleRate: 16000 });
            audioCtxRef.current = audioCtx;
            
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            // 2. Setup WebSocket
            const wsUrl = API_URL.replace('http', 'ws') + '/api/voice/stream';
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            
            ws.onopen = () => {
                setIsConnected(true);
                setAgentState('listening');
                
                // Start sending audio
                processor.onaudioprocess = (e) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcm16 = new Int16Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            const s = Math.max(-1, Math.min(1, inputData[i]));
                            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        }
                        ws.send(pcm16.buffer);
                    }
                };
                
                source.connect(processor);
                processor.connect(audioCtx.destination);
            };
            
            ws.onmessage = (event) => {
                try {
                    if (typeof event.data === 'string') {
                        const msg = JSON.parse(event.data);
                        handleWebSocketMessage(msg);
                    }
                } catch (err) {
                    console.error("Failed to parse WS message", err);
                }
            };
            
            ws.onerror = (err) => {
                console.error("WebSocket error:", err);
                setErrorMsg("Connection error.");
                disconnect();
            };
            
            ws.onclose = () => {
                disconnect();
            };
            
        } catch (err: any) {
            console.error("Failed to start voice agent", err);
            setErrorMsg(err.message || "Failed to start");
            disconnect();
        }
    };

    const disconnect = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }
        setIsConnected(false);
        setAgentState('idle');
        setActiveTool(null);
    };

    const handleWebSocketMessage = (msg: any) => {
        if (msg.type === 'audio' && msg.data) {
            playAudio(msg.data);
        } else if (msg.type === 'transcript') {
            setTranscript(prev => {
                return [...prev, { role: msg.role, text: msg.text }];
            });
        } else if (msg.type === 'tool_event') {
            if (msg.status === 'executing') {
                setActiveTool({ tool: msg.tool, status: msg.status });
            } else {
                setActiveTool(null);
            }
        } else if (msg.type === 'status') {
            setAgentState(msg.state);
        } else if (msg.type === 'error') {
            setErrorMsg(msg.message);
        }
    };

    const playAudio = (base64Data: string) => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        
        try {
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const pcm16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(pcm16.length);
            for (let i = 0; i < pcm16.length; i++) {
                float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
            }
            
            const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
            audioBuffer.getChannelData(0).set(float32);
            
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            
            if (nextPlayTimeRef.current < ctx.currentTime) {
                nextPlayTimeRef.current = ctx.currentTime;
            }
            
            source.start(nextPlayTimeRef.current);
            nextPlayTimeRef.current += audioBuffer.duration;
        } catch (err) {
            console.error("Audio playback error", err);
        }
    };

    return (
        <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-700/50 flex flex-col h-[500px] relative overflow-hidden">
            {/* Ambient Background for Dark Theme */}
            <div className="absolute inset-0 bg-gradient-to-b from-teal-900/10 to-slate-900/50 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
                            <Sparkles className="w-5 h-5 text-teal-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-lg leading-tight">Aura</h2>
                            <p className="text-teal-400 text-xs flex items-center gap-1">
                                {isConnected ? (
                                    <>
                                        <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                                        Connected
                                    </>
                                ) : (
                                    <>
                                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                                        Ready to assist
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Visualizer Area */}
                <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
                    {/* Pulsing Rings */}
                    {isConnected && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className={`w-32 h-32 rounded-full border-2 border-teal-500/30 absolute transition-all duration-1000 ${agentState === 'speaking' ? 'animate-ping' : ''}`} />
                            <div className={`w-40 h-40 rounded-full border border-teal-500/20 absolute transition-all duration-1000 delay-150 ${agentState === 'speaking' ? 'animate-ping' : ''}`} />
                        </div>
                    )}
                    
                    {/* Status Icon */}
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center z-10 shadow-lg transition-all duration-500 ${
                        !isConnected ? 'bg-slate-800 border-2 border-slate-700' :
                        agentState === 'speaking' ? 'bg-teal-500/20 border-2 border-teal-400 shadow-teal-500/30' :
                        agentState === 'thinking' ? 'bg-purple-500/20 border-2 border-purple-400 shadow-purple-500/30' :
                        'bg-blue-500/20 border-2 border-blue-400 shadow-blue-500/30'
                    }`}>
                        {!isConnected ? <PhoneOff className="w-8 h-8 text-slate-400" /> :
                         agentState === 'thinking' ? <Loader2 className="w-8 h-8 text-purple-400 animate-spin" /> :
                         agentState === 'speaking' ? <Activity className="w-8 h-8 text-teal-400 animate-pulse" /> :
                         <Mic className="w-8 h-8 text-blue-400" />}
                    </div>
                    
                    <div className="mt-4 text-center z-10">
                        <p className="text-sm font-medium text-slate-300">
                            {!isConnected ? "Press Call to start" :
                             agentState === 'listening' ? "Listening..." :
                             agentState === 'thinking' ? "Thinking..." :
                             "Speaking..."}
                        </p>
                    </div>

                    {/* Tool Event Badge */}
                    {activeTool && (
                        <div className="absolute bottom-2 bg-slate-800/80 backdrop-blur border border-slate-700 rounded-full px-4 py-1.5 flex items-center gap-2 z-10 text-sm shadow-xl animate-in slide-in-from-bottom-2">
                            <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                            <span className="text-slate-200 capitalize">{activeTool.tool.replace(/_/g, ' ')}...</span>
                        </div>
                    )}
                </div>

                {/* Transcript */}
                <div className="h-32 bg-slate-950/50 rounded-2xl border border-slate-800 p-3 overflow-y-auto mb-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent flex flex-col gap-2">
                    {transcript.length === 0 && !errorMsg ? (
                        <p className="text-slate-500 text-sm text-center mt-10 italic">Conversation transcript will appear here...</p>
                    ) : (
                        <div className="space-y-3 flex flex-col min-h-full justify-end">
                            {transcript.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 ml-1">{msg.role === 'user' ? 'You' : 'Aura'}</span>
                                    <div className={`px-3 py-1.5 rounded-2xl text-sm ${
                                        msg.role === 'user' 
                                            ? 'bg-blue-600/20 text-blue-100 border border-blue-500/20 rounded-tr-sm' 
                                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={transcriptEndRef} />
                        </div>
                    )}
                    {errorMsg && (
                        <p className="text-red-400 text-sm text-center mt-2 bg-red-900/20 py-1 rounded">{errorMsg}</p>
                    )}
                </div>

                {/* Controls */}
                <div className="flex justify-center pb-2">
                    {!isConnected ? (
                        <button
                            onClick={connect}
                            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3 px-8 rounded-full shadow-lg shadow-teal-500/20 transition-all hover:scale-105"
                        >
                            <Phone className="w-5 h-5 fill-slate-950" />
                            <span>Call Aura</span>
                        </button>
                    ) : (
                        <button
                            onClick={disconnect}
                            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold py-3 px-8 rounded-full transition-all"
                        >
                            <PhoneOff className="w-5 h-5" />
                            <span>End Call</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
