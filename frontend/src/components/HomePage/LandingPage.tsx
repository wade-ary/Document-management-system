import React, { useState, useEffect } from "react";
import Image from "next/image";
import { FileText, Users, Globe, Shield, AlertTriangle, CheckCircle, Search, Database, Brain, Zap, Star, ArrowRight, Play, Target, Calendar, Network } from "lucide-react";

const LandingPage = () => {
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    {
      icon: <Search className="w-12 h-12 text-blue-500" />,
      title: "Intelligent Search",
      description: "Advanced AI-powered search across all documents with contextual understanding and multilingual support."
    },
    {
      icon: <Database className="w-12 h-12 text-green-500" />,
      title: "Unified Database",
      description: "Centralized access to regulations, policies, projects, and schemes from all departments in one place."
    },
    {
      icon: <Brain className="w-12 h-12 text-purple-500" />,
      title: "Smart Summarization",
      description: "Get instant, accurate summaries of complex documents with key insights highlighted automatically."
    },
    {
      icon: <Zap className="w-12 h-12 text-yellow-500" />,
      title: "Real-time Alerts",
      description: "Stay updated with compliance deadlines, policy changes, and relevant updates across departments."
    }
  ];

  // ...existing code...

  useEffect(() => {
    const featureInterval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);

    return () => {
      clearInterval(featureInterval);
    };
  }, [features.length]);
  return (
    <main className="min-h-screen">
      {/* Hero Section with Grid Background */}
      <section className="relative min-h-screen flex flex-col md:flex-row items-center justify-between bg-slate-50 overflow-hidden">
        {/* Grid Background Pattern - Extended longer */}
        <div className="absolute inset-0 bg-slate-50">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_80%_at_50%_0%,#000_70%,transparent_110%)]"></div>
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-6 py-20 gap-16 w-full flex flex-col lg:flex-row items-center relative z-10">
          {/* Left: Text */}
          <div className="flex-1 flex flex-col items-start justify-center space-y-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-block bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                AI for Bharat
              </span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-current" />
                ))}
                <span className="text-sm text-slate-600 ml-2 font-medium">4.9/5 Rating</span>
              </div>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-tight">
              Smarter Data 
              <span className="block text-blue-600">Retrieval</span>
              <span className="block text-slate-700">for Bharat</span>
            </h1>
            
            <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">
              Transform how your department accesses, analyzes, and acts on critical information. Our AI-powered platform instantly searches through vast databases of regulations, policies, and schemes—eliminating manual searches and knowledge silos forever.
            </p>

            {/* Key Benefits Grid */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-xl">
              <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="text-slate-700 font-medium">10x Faster Search</span>
              </div>
              <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="text-slate-700 font-medium">99% Accuracy</span>
              </div>
              <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="text-slate-700 font-medium">Multi-language Support</span>
              </div>
              <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="text-slate-700 font-medium">Real-time Updates</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => window.location.href = '/sign-in'}
                className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-3"
              >
                <Play className="w-5 h-5" />
                Try Live Demo
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="group px-8 py-4 rounded-xl border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-all duration-300 flex items-center gap-3">
                <FileText className="w-5 h-5" />
                View Documentation
              </button>
              <button
                onClick={() => window.location.href = '/document-chat'}
                className="group px-8 py-4 rounded-xl border-2 border-green-500 text-green-700 font-semibold hover:bg-green-50 transition-all duration-300 flex items-center gap-3"
              >
                <Shield className="w-5 h-5" />
                Compliant Chat
              </button>
            </div>
          </div>

          {/* Right: Logo (Aligned with Heading, increased size and moved up) */}
          <div className="flex-1 flex justify-center items-center">
            <div className="relative flex flex-col items-center">
              <div className="absolute inset-0 bg-blue-200/30 rounded-full blur-3xl scale-110"></div>
              <Image
                src="/image-removebg-preview.png"
                alt="EduData Insight Logo"
                width={420}
                height={420}
                className="relative object-contain drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Animated Feature Carousel */}

      <section className="py-24 bg-gradient-to-b from-blue-100/80 via-white to-slate-100/60 relative overflow-hidden">
        {/* Enhanced Background Pattern */}
        <div className="absolute inset-0 opacity-60 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 60%),
                radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.12) 0%, transparent 60%),
                radial-gradient(circle at 40% 40%, rgba(139, 92, 246, 0.10) 0%, transparent 60%)
              `,
              backgroundSize: '600px 600px'
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">Powerful AI Features</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Discover cutting-edge capabilities that revolutionize data retrieval and analysis
            </p>
          </div>

          <div className="relative">
            {/* Card shadow background for separation */}
            <div className="absolute left-1/2 -translate-x-1/2 top-8 w-[98%] h-[90%] rounded-3xl bg-blue-100/40 blur-2xl shadow-2xl shadow-blue-200/40 z-0"></div>
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 border border-blue-100/60 shadow-xl shadow-blue-500/5 relative z-10">
              <div className="flex items-center justify-center">
                <div className="text-center max-w-lg">
                  <div className="mb-8 flex justify-center">
                    <div className="p-6 bg-gradient-to-br from-white to-blue-50/50 rounded-2xl shadow-lg border border-blue-100/80 backdrop-blur-sm">
                      {features[currentFeature].icon}
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-6">
                    {features[currentFeature].title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed text-lg">
                    {features[currentFeature].description}
                  </p>
                </div>
              </div>
            </div>
            {/* Feature Navigation Dots */}
            <div className="flex justify-center mt-8 gap-3">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentFeature(index)}
                  className={`h-3 rounded-full transition-all duration-300 ${
                    index === currentFeature
                      ? 'bg-blue-600 w-12 shadow-lg shadow-blue-600/30'
                      : 'bg-slate-300 hover:bg-blue-400 w-3'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Problem & Solution */}
      <section className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-white mb-6">The Challenge We Solve</h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Traditional data retrieval methods are holding back education departments in the Ministry
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-stretch">
            {/* Problem Side */}
            <div className="flex flex-col h-full">
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-red-500 rounded-xl">
                    <AlertTriangle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-red-400">Current Problems</h3>
                </div>

                <div className="space-y-6 flex-grow">
                  {[
                    { 
                      title: "Manual Search Inefficiency", 
                      desc: "Staff spend 60% of their time searching through scattered documents across multiple systems",
                      impact: "3-5 hours daily per employee"
                    },
                    { 
                      title: "Information Silos", 
                      desc: "Departments operate in isolation with no unified access to cross-functional data",
                      impact: "Duplicate work & missed opportunities"
                    },
                    { 
                      title: "Compliance Risks", 
                      desc: "Manual processes lead to missed regulatory updates and compliance failures",
                      impact: "Legal & financial penalties"
                    },
                    { 
                      title: "Knowledge Loss", 
                      desc: "Critical institutional knowledge disappears when experienced staff leave",
                      impact: "Operational disruption"
                    }
                  ].map((item, index) => (
                    <div key={index} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h4 className="font-semibold text-white mb-2">{item.title}</h4>
                      <p className="text-slate-300 text-sm mb-3">{item.desc}</p>
                      <div className="text-xs text-red-400 font-medium bg-red-500/10 px-3 py-1 rounded-full inline-block">
                        Impact: {item.impact}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Solution Side */}
            <div className="flex flex-col h-full">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-emerald-500 rounded-xl">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-400">Our Solutions</h3>
                </div>

                <div className="space-y-6 flex-grow">
                  {[
                    { 
                      title: "AI-Powered Instant Search", 
                      desc: "Find any information across all databases in seconds with natural language queries",
                      benefit: "95% time reduction in search"
                    },
                    { 
                      title: "Unified Data Platform", 
                      desc: "Single access point for all departmental regulations, policies, and schemes",
                      benefit: "Complete organizational visibility"
                    },
                    { 
                      title: "Automated Compliance Monitoring", 
                      desc: "Real-time alerts for regulatory changes and compliance deadlines",
                      benefit: "100% compliance assurance"
                    },
                    { 
                      title: "Knowledge Preservation", 
                      desc: "Intelligent categorization and preservation of all institutional knowledge",
                      benefit: "Zero knowledge loss"
                    }
                  ].map((item, index) => (
                    <div key={index} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h4 className="font-semibold text-white mb-2">{item.title}</h4>
                      <p className="text-slate-300 text-sm mb-3">{item.desc}</p>
                      <div className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-3 py-1 rounded-full inline-block">
                        Benefit: {item.benefit}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Carousel */}
            {/* Enhanced Real World Applications */}
      <section className="py-24 bg-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-white mb-6">Transforming Education for the Ministry</h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              See how our platform revolutionizes data access across different educational scenarios
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Policy Research & Analysis",
                icon: <FileText className="w-12 h-12 text-blue-400" />,
                scenario: "A researcher needs to analyze education policies from the last 5 years",
                solution: "AI instantly cross-references 1000+ documents, extracts key trends, and generates comparative analysis",
                results: ["5 hours → 15 minutes", "100% accuracy", "Comprehensive insights"],
                color: "blue"
              },
              {
                title: "Compliance Monitoring",
                icon: <Shield className="w-12 h-12 text-emerald-400" />,
                scenario: "University needs to ensure compliance with new UGC regulations",
                solution: "Automated monitoring alerts staff of regulatory changes and maps requirements to current policies",
                results: ["Zero compliance violations", "Real-time updates", "Proactive notifications"],
                color: "emerald"
              },
              {
                title: "Grant & Scheme Discovery",
                icon: <Target className="w-12 h-12 text-purple-400" />,
                scenario: "Department seeks funding opportunities for infrastructure development",
                solution: "Smart search identifies matching grants, analyzes eligibility criteria, and tracks application deadlines",
                results: ["300% more opportunities found", "Higher success rates", "Never miss deadlines"],
                color: "purple"
              },
              {
                title: "Academic Planning",
                icon: <Calendar className="w-12 h-12 text-orange-400" />,
                scenario: "Planning department creates 5-year academic development strategy",
                solution: "Platform analyzes historical data, current trends, and policy directions to inform strategic decisions",
                results: ["Data-driven decisions", "Predictive insights", "Strategic alignment"],
                color: "orange"
              },
              {
                title: "Student Services Optimization",
                icon: <Users className="w-12 h-12 text-pink-400" />,
                scenario: "Student affairs office needs to update service policies based on new guidelines",
                solution: "Instant access to related policies, automatic impact analysis, and implementation recommendations",
                results: ["Faster policy updates", "Consistent implementation", "Better student experience"],
                color: "pink"
              },
              {
                title: "Inter-departmental Collaboration",
                icon: <Network className="w-12 h-12 text-cyan-400" />,
                scenario: "Multiple departments collaborate on a cross-functional education initiative",
                solution: "Unified platform provides shared access to relevant documents, policies, and historical precedents",
                results: ["Seamless collaboration", "Shared knowledge base", "Aligned objectives"],
                color: "cyan"
              }
            ].map((app, index) => (
              <div key={index} className="group">
                <div className="bg-slate-900 rounded-2xl p-8 border border-slate-700 hover:border-slate-600 transition-all duration-300 hover:transform hover:scale-105 h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`p-3 bg-${app.color}-500/10 rounded-xl group-hover:bg-${app.color}-500/20 transition-colors`}>
                      {app.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white">{app.title}</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-slate-300 mb-2">Scenario:</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">{app.scenario}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-slate-300 mb-2">How We Help:</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">{app.solution}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-slate-300 mb-3">Results:</h4>
                      <div className="space-y-2">
                        {app.results.map((result, idx) => (
                          <div key={idx} className={`flex items-center gap-2 text-sm text-${app.color}-400`}>
                            <CheckCircle className="w-4 h-4" />
                            <span>{result}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <div className="bg-slate-900 rounded-2xl p-8 border border-slate-700 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-white mb-4">Ready to Transform Your Department?</h3>
              <p className="text-slate-300 mb-6">
                Join thousands of education professionals who have revolutionized their data access with EduData Insight
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>30-day free trial</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>No setup fees</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>24/7 support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Stats Section with Animation */}
      <section className="py-20 bg-blue-600 text-white relative overflow-hidden">
        {/* Simple Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-20 bg-blue-700/20"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Trusted by Leading Institutions</h2>
            <p className="text-xl text-blue-200">Real impact, measurable results</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: <FileText className="w-12 h-12 text-blue-300" />, number: "2,000+", label: "Documents Processed", subtext: "Daily processing capacity" },
              { icon: <Users className="w-12 h-12 text-green-300" />, number: "50+", label: "Departments", subtext: "Across India" },
              { icon: <Globe className="w-12 h-12 text-purple-300" />, number: "12", label: "Languages", subtext: "Regional support" },
              { icon: <Shield className="w-12 h-12 text-red-300" />, number: "99.9%", label: "Uptime", subtext: "Reliability guaranteed" }
            ].map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
                  <div className="flex justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    {stat.icon}
                  </div>
                  <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                    {stat.number}
                  </div>
                  <div className="text-lg font-semibold text-blue-100 mb-1">{stat.label}</div>
                  <div className="text-sm text-blue-300">{stat.subtext}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Success Metrics */}
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-yellow-400 mb-2">85%</div>
              <div className="text-lg text-blue-200">Time Saved</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-green-400 mb-2">95%</div>
              <div className="text-lg text-blue-200">User Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white-400 mb-2">10x</div>
              <div className="text-lg text-blue-200">Faster Decisions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Call to Action */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 via-white to-blue-100 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-2000"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center px-6 relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-blue-700 mb-6">
            Ready to Transform Your Department?
          </h2>
          <p className="text-xl text-gray-700 mb-8 leading-relaxed max-w-3xl mx-auto">
            Join thousands of education professionals who have revolutionized their workflow with EduData Insight. 
            Experience the future of data retrieval today.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <button
              onClick={() => window.location.href = '/sign-in'}
              className="group bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white px-10 py-5 rounded-xl font-bold text-lg shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center gap-3"
            >
              <Play className="w-6 h-6" />
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="group px-10 py-5 rounded-xl border-2 border-blue-600 text-blue-600 font-bold text-lg hover:bg-blue-50 transition-all duration-300 flex items-center gap-3">
              <FileText className="w-6 h-6" />
              Schedule Demo
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-gray-200">
            <div className="flex flex-col items-center">
              <Shield className="w-8 h-8 text-green-500 mb-2" />
              <span className="text-sm text-gray-600 font-medium">SOC 2 Certified</span>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircle className="w-8 h-8 text-blue-500 mb-2" />
              <span className="text-sm text-gray-600 font-medium">99.9% Uptime</span>
            </div>
            <div className="flex flex-col items-center">
              <Users className="w-8 h-8 text-purple-500 mb-2" />
              <span className="text-sm text-gray-600 font-medium">24/7 Support</span>
            </div>
            <div className="flex flex-col items-center">
              <Globe className="w-8 h-8 text-blue-500 mb-2" />
              <span className="text-sm text-gray-600 font-medium">Global Access</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LandingPage;