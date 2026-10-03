import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

type Props={
  children:React.ReactNode;
  title?:string;
  onRetry?:()=>void;
};

type State={hasError:boolean;message:string};

class ModuleErrorBoundary extends React.Component<Props,State>{
  state:State={hasError:false,message:''};

  static getDerivedStateFromError(error:unknown):State{
    return{
      hasError:true,
      message:error instanceof Error?error.message:String(error||'Ukjent modulfeil'),
    };
  }

  componentDidCatch(error:unknown,info:React.ErrorInfo){
    console.error('[ModuleErrorBoundary]',error,info);
  }

  reset=()=>{
    this.setState({hasError:false,message:''});
    this.props.onRetry?.();
  };

  render(){
    if(!this.state.hasError)return this.props.children;
    return <div className="rounded-[2rem] border border-red-500/25 bg-red-500/[0.06] p-6 text-white">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-red-300 mt-0.5" size={22}/>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest font-black text-red-300">Modulfeil</p>
          <h3 className="text-xl font-black mt-1">{this.props.title||'Denne arbeidsflaten kunne ikke vises'}</h3>
          <p className="text-sm text-slate-400 mt-2">I stedet for en blank side viser Olivia nå feilen og lar deg prøve på nytt.</p>
          {this.state.message&&<pre className="mt-4 whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-red-100">{this.state.message}</pre>}
          <button onClick={this.reset} className="mt-4 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-black flex items-center gap-2 hover:bg-white/15"><RefreshCcw size={14}/>Prøv igjen</button>
        </div>
      </div>
    </div>;
  }
}

export default ModuleErrorBoundary;
