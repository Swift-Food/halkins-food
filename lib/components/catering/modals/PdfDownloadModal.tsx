"use client";

import { FileText, Users, DollarSign } from "lucide-react";
import { PdfDownloadModalProps } from "../types";

export default function PdfDownloadModal({
  onDownload,
  onClose,
  isGenerating = false,
}: PdfDownloadModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Download Menu PDF</h3>
            <p className="text-sm text-gray-500">Choose your preferred format</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {/* With Prices Option */}
          <button
            onClick={() => onDownload(true)}
            disabled={isGenerating}
            className="w-full p-4 rounded-xl border-2 border-base-300 hover:border-primary hover:bg-primary/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                  With Prices
                </p>
                <p className="text-sm text-gray-500">
                  Full menu with pricing details for budget planning
                </p>
              </div>
            </div>
          </button>

          {/* Without Prices Option */}
          <button
            onClick={() => onDownload(false)}
            disabled={isGenerating}
            className="w-full p-4 rounded-xl border-2 border-base-300 hover:border-primary hover:bg-primary/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                  Without Prices
                </p>
                <p className="text-sm text-gray-500">
                  Clean menu for sharing with event guests
                </p>
              </div>
            </div>
          </button>
        </div>

        {isGenerating && (
          <div className="flex items-center justify-center gap-2 mb-4 text-primary">
            <span className="loading loading-spinner loading-sm"></span>
            <span className="text-sm font-medium">Generating PDF...</span>
          </div>
        )}

        <button
          onClick={onClose}
          disabled={isGenerating}
          className="w-full px-4 py-3 border border-base-300 text-gray-600 rounded-xl hover:bg-base-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
