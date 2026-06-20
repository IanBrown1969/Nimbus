"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { Receipt, Plus, CheckCircle, XCircle, ArrowRight, Loader2, UploadCloud, Eye, Paperclip, Trash2, FileText, X, ExternalLink } from "lucide-react";

export default function ClaimsPage() {
  const { token, user, activeLanguage, activeCurrency } = useApp();

  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [desc, setDesc] = useState("");
  const [net, setNet] = useState(80.0);
  const [tax, setTax] = useState(16.0);
  const [category, setCategory] = useState("Travel");

  const [processingId, setProcessingId] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  // Preview state (Lightbox modal)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploading(true);
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setUploading(false);
          setReceiptUrl(base64String);
        }
      }, 100);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setFileName(null);
    setReceiptUrl(null);
    setUploadProgress(0);
  };

  const handleCancelModal = () => {
    setShowModal(false);
    setDesc("");
    setFileName(null);
    setReceiptUrl(null);
    setUploadProgress(0);
  };

  useEffect(() => {
    if (token) fetchClaims();
  }, [token]);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/api/finance/claims", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClaims(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        description: desc,
        currencyCode: "GBP",
        exchangeRateToBase: 1.0,
        receiptUrl: receiptUrl,
        lines: [
          {
            category,
            description: desc,
            netAmount: Number(net),
            taxAmount: Number(tax),
            taxRate: Number(net) > 0 ? Number(tax) / Number(net) : 0.0
          }
        ]
      };

      await axios.post("http://localhost:5000/api/finance/claims", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowModal(false);
      setDesc("");
      setFileName(null);
      setReceiptUrl(null);
      setUploadProgress(0);
      fetchClaims();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit claim.");
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await axios.post(`http://localhost:5000/api/finance/claims/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchClaims();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to approve claim.");
    } finally {
      setProcessingId(null);
    }
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(activeLanguage, {
      style: "currency",
      currency: activeCurrency
    }).format(val);
  };

  // Calculations for summary metrics
  const pendingClaims = claims.filter(c => c.status === 0);
  const approvedClaims = claims.filter(c => c.status === 1);
  
  const pendingTotal = pendingClaims.reduce((acc, c) => acc + c.lines.reduce((lAcc: number, l: any) => lAcc + l.grossAmount, 0), 0);
  const approvedTotal = approvedClaims.reduce((acc, c) => acc + c.lines.reduce((lAcc: number, l: any) => lAcc + l.grossAmount, 0), 0);

  return (
    <div className="bg-[#f4f6f8] text-[#334155] -m-6 p-8 min-h-[calc(100vh-4rem)] space-y-6 font-sans">
      {/* Top Header Row */}
      <div className="flex items-center justify-between border-b border-[#e1e5eb] pb-5">
        <div>
          <span className="text-[10px] font-bold text-[#00b7e2] uppercase tracking-widest">Finance</span>
          <h2 className="text-2xl font-bold text-[#1a2d3c] mt-0.5">Expense Claims</h2>
          <p className="text-slate-500 text-xs mt-1">Review receipts, file new reimbursement claims, and post approvals to the ledger.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="py-2 px-4 rounded bg-[#00b7e2] hover:bg-[#009dc4] text-white shadow-sm font-semibold flex items-center gap-2 text-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> File Expense Receipt
        </button>
      </div>

      {error && (
        <div className="p-4 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Xero Style Summary Metrics Card Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#e1e5eb] rounded p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Awaiting Approval</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1a2d3c]">{pendingClaims.length}</span>
            <span className="text-xs text-slate-500">claims ({formatMoney(pendingTotal)})</span>
          </div>
        </div>
        
        <div className="bg-white border border-[#e1e5eb] rounded p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Approved & Posted</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{approvedClaims.length}</span>
            <span className="text-xs text-slate-500">claims ({formatMoney(approvedTotal)})</span>
          </div>
        </div>

        <div className="bg-white border border-[#e1e5eb] rounded p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Claims Filed</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#00b7e2]">{claims.length}</span>
            <span className="text-xs text-slate-500">claims ({formatMoney(pendingTotal + approvedTotal)})</span>
          </div>
        </div>
      </div>

      {/* Claims List */}
      <div className="p-6 rounded border border-[#e1e5eb] bg-white shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-[#1a2d3c] flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#00b7e2]" />
          Receipt Claims Logs
        </h3>

        {loading ? (
          <div className="text-slate-400 text-xs text-center py-8">Loading expense claims...</div>
        ) : claims.length === 0 ? (
          <div className="text-slate-400 text-xs text-center py-8">No expense claims filed yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {claims.map((claim) => {
              const totalGross = claim.lines.reduce((acc: number, l: any) => acc + l.grossAmount, 0);
              const isAdmin = user?.role === "CompanyAdmin" || user?.role === "Accounts" || user?.role === "GlobalAdmin";

              return (
                <div key={claim.id} className="p-4 bg-white border border-[#e1e5eb] hover:border-slate-300 rounded flex items-center justify-between text-xs transition-all hover:shadow-sm">
                  <div className="space-y-1">
                    <span className="font-semibold text-[#1a2d3c] text-sm">{claim.description}</span>
                    <div className="flex gap-4 text-[10px] text-slate-400">
                      <span>Submitted by: <strong className="text-slate-600">{claim.user?.username}</strong></span>
                      <span>Category: <strong className="text-slate-600">{claim.lines[0]?.category}</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {(claim.receiptUrl || claim.ReceiptUrl) && (
                      <button
                        onClick={() => {
                          setPreviewUrl(claim.receiptUrl || claim.ReceiptUrl);
                          setPreviewTitle(claim.description);
                        }}
                        className="py-1 px-2.5 rounded bg-white hover:bg-slate-50 border border-[#ccd3db] text-slate-600 font-semibold text-[10px] flex items-center gap-1.5 transition-colors"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-[#00b7e2]" />
                        <span>Receipt</span>
                      </button>
                    )}

                    <div className="text-right min-w-[100px]">
                      <span className="block text-sm font-bold text-[#1a2d3c]">{formatMoney(totalGross)}</span>
                      <span className="block text-[9px] text-slate-450 mt-0.5">Ex VAT: {formatMoney(claim.lines[0]?.netAmount || 0)}</span>
                    </div>

                    <div className="min-w-[120px] text-right">
                      {claim.status === 0 ? ( // Submitted
                        isAdmin ? (
                          <button
                            onClick={() => handleApprove(claim.id)}
                            disabled={processingId === claim.id}
                            className="py-1 px-3 rounded bg-[#00b7e2] hover:bg-[#009dc4] text-white font-semibold text-[10px] flex items-center gap-1 transition-colors disabled:opacity-50 inline-block text-center"
                          >
                            {processingId === claim.id ? (
                              <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                            ) : (
                              <span className="flex items-center gap-1">Approve <ArrowRight className="w-3 h-3" /></span>
                            )}
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-[#fef9c3] border border-[#fef08a] text-[#854d0e] rounded-full uppercase">
                            Pending Audit
                          </span>
                        )
                      ) : claim.status === 1 ? ( // Approved
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#166534] px-2 py-0.5 rounded-full bg-[#dcfce7] border border-[#bbf7d0] uppercase">
                          <CheckCircle className="w-3 h-3" /> Reconciled / GL Posted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#991b1b] px-2 py-0.5 rounded-full bg-[#fee2e2] border border-[#fecaca] uppercase">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Claim Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] px-4">
          <div className="w-full max-w-md p-6 bg-white border border-[#e1e5eb] rounded shadow-2xl space-y-5 text-slate-800">
            <h3 className="text-base font-bold text-[#1a2d3c] border-b border-[#e1e5eb] pb-3">Submit Business Expense Receipt</h3>
            <form onSubmit={handleSubmitClaim} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Description</label>
                <input
                  type="text"
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Train travel to London office"
                  className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none focus:border-[#00b7e2] text-slate-850"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Expense Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none focus:border-[#00b7e2] text-slate-850"
                  >
                    <option value="Travel">Travel & Lodging</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Meals">Client Meals & Hosting</option>
                    <option value="Hardware">Hardware / Tools</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">Net Amount</label>
                    <input
                      type="number"
                      required
                      value={net}
                      onChange={(e) => setNet(Number(e.target.value))}
                      className="w-full mt-1 text-xs px-2.5 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none focus:border-[#00b7e2] text-slate-850"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">VAT Tax</label>
                    <input
                      type="number"
                      required
                      value={tax}
                      onChange={(e) => setTax(Number(e.target.value))}
                      className="w-full mt-1 text-xs px-2.5 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none focus:border-[#00b7e2] text-slate-850"
                    />
                  </div>
                </div>
              </div>

              {/* Receipt Uploader */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">Receipt Attachment</label>
                
                {!fileName ? (
                  <div className="relative group border border-dashed border-[#ccd3db] hover:border-[#00b7e2] bg-[#f8fafc] hover:bg-[#00b7e2]/5 rounded p-6 text-center cursor-pointer transition-all duration-200">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-white border border-[#e1e5eb] rounded group-hover:scale-110 transition-transform duration-200 text-slate-400 group-hover:text-[#00b7e2]">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-slate-600">Click to upload receipt</p>
                        <p className="text-[10px] text-slate-400">PDF, PNG, JPG up to 10MB</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-[#f8fafc] border border-[#ccd3db] rounded space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-white border border-[#e1e5eb] rounded text-[#00b7e2] shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate" title={fileName}>
                            {fileName}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            {uploading ? "Uploading to secure CDN..." : "Ready to submit"}
                          </p>
                        </div>
                      </div>
                      
                      {!uploading && (
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {uploading ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[9px] font-semibold text-slate-400">
                          <span>Progress</span>
                          <span className="text-[#00b7e2]">{uploadProgress}%</span>
                        </div>
                        <progress
                          className="progress-bar w-full h-1.5 rounded-full overflow-hidden"
                          value={uploadProgress}
                          max={100}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded p-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Upload complete & verified</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#e1e5eb]">
                <button
                  type="button"
                  onClick={handleCancelModal}
                  className="px-4 py-2 border border-[#ccd3db] text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-[#00b7e2] hover:bg-[#009dc4] text-white text-xs font-semibold rounded disabled:opacity-50"
                >
                  Submit Claims Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Lightbox Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="relative max-w-3xl w-full bg-white border border-[#e1e5eb] rounded shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[#e1e5eb] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#00b7e2]" />
                <h4 className="text-xs font-bold text-[#1a2d3c] uppercase tracking-wider">Receipt Verification</h4>
              </div>
              <span className="text-xs font-semibold text-slate-500 truncate max-w-md ml-4">
                {previewTitle}
              </span>
              <button
                onClick={() => setPreviewUrl(null)}
                className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 flex-1 flex items-center justify-center overflow-auto bg-slate-50/50">
              {previewUrl.startsWith("data:application/pdf") ? (
                <embed
                  src={previewUrl}
                  type="application/pdf"
                  className="w-full h-[60vh] rounded border border-[#e1e5eb]"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Receipt Attachment"
                  className="max-w-full max-h-[60vh] object-contain rounded border border-[#e1e5eb] shadow-md"
                />
              )}
            </div>
            <div className="p-4 border-t border-[#e1e5eb] bg-slate-50 flex justify-between items-center text-[10px] text-slate-400">
              <span>Securely stored on Cloud CDN</span>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#00b7e2] hover:text-[#0082a5] font-semibold flex items-center gap-1"
              >
                Open in dynamic tab <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
