import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import toast from "react-hot-toast";

// Define document type
type FamilyDocumentType = {
  id: string;
  name: string;
  type: string;
  fileUrl: string;
  description?: string;
  createdAt: string;
};

// Define family type
type FamilyType = {
  id: string;
  name: string;
  documents?: FamilyDocumentType[];
};

// Define form validation schema
const documentSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  type: z.string().min(1, "Document type is required"),
  description: z.string().optional(),
  fileUrl: z.string().min(1, "File URL is required"),
});

type DocumentFormValues = z.infer<typeof documentSchema>;

// Component props
interface FamilyDocumentsProps {
  family?: FamilyType;
  onDocumentsUpdated?: () => void;
}

export function FamilyDocuments({ family, onDocumentsUpdated }: FamilyDocumentsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<FamilyDocumentType | null>(null);
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  // Initialize form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      name: "",
      type: "emergency_contact",
      description: "",
      fileUrl: "",
    },
  });
  
  // Fetch documents
  const { 
    data: documentsData, 
    isLoading: isLoadingDocuments,
    refetch: refetchDocuments
  } = api.getFamilyDocuments.useQuery(
    { token: token || "", familyId: family?.id || "" },
    {
      enabled: !!token && !!family?.id,
      onError: (err) => {
        console.error("Error fetching family documents:", err);
      },
    }
  );
  
  // Upload document mutation
  const uploadDocumentMutation = api.uploadFamilyDocument.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      setIsUploading(false);
      setUploadProgress(0);
      reset();
      refetchDocuments();
      if (onDocumentsUpdated) {
        onDocumentsUpdated();
      }
    },
    onError: (error) => {
      toast.error(`Failed to upload document: ${error.message}`);
      setIsUploading(false);
    },
  });
  
  // Delete document mutation
  const deleteDocumentMutation = api.deleteFamilyDocument.useMutation({
    onSuccess: () => {
      toast.success("Document deleted successfully");
      refetchDocuments();
      if (onDocumentsUpdated) {
        onDocumentsUpdated();
      }
    },
    onError: (error) => {
      toast.error(`Failed to delete document: ${error.message}`);
    },
  });
  
  // Handle file upload (simulated for now)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Simulate file upload progress
    setIsUploading(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        // Simulate a successful upload with a fake URL
        setValue("fileUrl", `https://storage.example.com/documents/${file.name}`);
        setValue("name", file.name);
        setIsUploading(false);
        toast.success("File uploaded successfully");
      }
    }, 300);
  };
  
  // Handle form submission
  const onSubmit = (data: DocumentFormValues) => {
    if (!family?.id) {
      toast.error("Family ID is required");
      return;
    }
    
    if (isOnline) {
      // If online, update directly
      uploadDocumentMutation.mutate({
        token: token!,
        familyId: family.id,
        name: data.name,
        type: data.type,
        fileUrl: data.fileUrl,
        description: data.description,
      });
    } else {
      // If offline, add to sync queue
      try {
        addOperation({
          operationType: "CREATE",
          modelName: "FamilyDocument",
          recordId: crypto.randomUUID(),
          data: {
            familyId: family.id,
            name: data.name,
            type: data.type,
            fileUrl: data.fileUrl,
            description: data.description,
            createdAt: new Date().toISOString(),
          },
        });
        
        toast.success("Document saved for syncing when back online");
        reset();
        if (onDocumentsUpdated) {
          onDocumentsUpdated();
        }
      } catch (error) {
        toast.error("Failed to save document offline");
      }
    }
  };
  
  // Handle document deletion
  const handleDeleteDocument = (documentId: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }
    
    if (isOnline) {
      deleteDocumentMutation.mutate({
        token: token!,
        documentId,
      });
    } else {
      try {
        addOperation({
          operationType: "DELETE",
          modelName: "FamilyDocument",
          recordId: documentId,
          data: {},
        });
        
        toast.success("Document deletion saved for syncing when back online");
        if (onDocumentsUpdated) {
          onDocumentsUpdated();
        }
      } catch (error) {
        toast.error("Failed to delete document offline");
      }
    }
  };
  
  // Handle document view
  const handleViewDocument = (document: FamilyDocumentType) => {
    setSelectedDocument(document);
  };
  
  // Format document type for display
  const formatDocumentType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Family Documents</h3>
      </div>
      
      {/* Document list */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Document Library</h3>
        </div>
        <div className="border-t border-gray-200">
          {isLoadingDocuments ? (
            <div className="p-4 text-center">
              <div className="inline-block animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div>
              <p className="mt-2 text-gray-500">Loading documents...</p>
            </div>
          ) : !documentsData || documentsData.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Added
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documentsData.map((document) => (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{document.name}</div>
                        {document.description && (
                          <div className="text-sm text-gray-500">{document.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {formatDocumentType(document.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(document.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleViewDocument(document)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                          <a
                            href={document.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-900"
                          >
                            Download
                          </a>
                          <button
                            onClick={() => handleDeleteDocument(document.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Document viewer modal */}
      {selectedDocument && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      {selectedDocument.name}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Type: {formatDocumentType(selectedDocument.type)}
                      </p>
                      {selectedDocument.description && (
                        <p className="text-sm text-gray-500 mt-2">
                          {selectedDocument.description}
                        </p>
                      )}
                      <div className="mt-4">
                        {selectedDocument.fileUrl.endsWith('.pdf') ? (
                          <iframe 
                            src={selectedDocument.fileUrl} 
                            className="w-full h-96 border border-gray-300 rounded"
                            title={selectedDocument.name}
                          ></iframe>
                        ) : selectedDocument.fileUrl.match(/\.(jpeg|jpg|png|gif)$/i) ? (
                          <img 
                            src={selectedDocument.fileUrl} 
                            alt={selectedDocument.name}
                            className="max-w-full h-auto rounded"
                          />
                        ) : (
                          <div className="p-4 border border-gray-300 rounded bg-gray-50 text-center">
                            <p>Preview not available</p>
                            <a
                              href={selectedDocument.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Download File
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setSelectedDocument(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Upload new document form */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Upload New Document</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Upload important family documents like emergency contacts, care agreements, or medical forms.
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Upload File
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, PNG, JPG, GIF up to 10MB
                    </p>
                    
                    {isUploading && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Uploading: {uploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <input
                  type="hidden"
                  {...register("fileUrl")}
                />
                {errors.fileUrl && (
                  <p className="mt-1 text-sm text-red-600">{errors.fileUrl.message}</p>
                )}
              </div>
              
              <div>
                <Input
                  label="Document Name"
                  {...register("name")}
                  error={errors.name?.message}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Document Type
                </label>
                <select
                  {...register("type")}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="emergency_contact">Emergency Contact</option>
                  <option value="care_agreement">Care Agreement</option>
                  <option value="medical_form">Medical Form</option>
                  <option value="consent_form">Consent Form</option>
                  <option value="legal_document">Legal Document</option>
                  <option value="school_document">School Document</option>
                  <option value="other">Other</option>
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                )}
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description (Optional)
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Brief description of the document"
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={isUploading}
              >
                Upload Document
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
