import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

// Define the certification schema for validation
const certificationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Certification name is required"),
  issuingAuthority: z.string().min(1, "Issuing authority is required"),
  dateIssued: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid date issued format",
  }),
  expiryDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid expiry date format",
  }).optional().or(z.literal("")),
  certificateUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
  status: z.enum(["Active", "Expired", "Pending"]),
});

type CertificationFormValues = z.infer<typeof certificationSchema>;

interface Certification {
  id: string;
  name: string;
  issuingAuthority: string;
  dateIssued: string | Date;
  expiryDate?: string | Date | null;
  certificateUrl?: string | null;
  status: "Active" | "Expired" | "Pending";
  isExpired?: boolean;
  expiresInDays?: number | null;
}

interface CertificationManagerProps {
  certifications: Certification[];
  onCertificationUpdated: () => void;
}

export function CertificationManager({ certifications, onCertificationUpdated }: CertificationManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CertificationFormValues>({
    resolver: zodResolver(certificationSchema),
    defaultValues: {
      name: "",
      issuingAuthority: "",
      dateIssued: new Date().toISOString().split('T')[0],
      status: "Active",
    },
  });
  
  const manageCertificationMutation = api.manageCertification.useMutation({
    onSuccess: () => {
      toast.success(editingCertId 
        ? "Certification updated successfully" 
        : "Certification added successfully"
      );
      setIsSubmitting(false);
      setShowForm(false);
      setEditingCertId(null);
      reset();
      onCertificationUpdated();
    },
    onError: (error) => {
      toast.error(`Failed to ${editingCertId ? 'update' : 'add'} certification: ${error.message}`);
      setIsSubmitting(false);
    },
  });
  
  const handleEdit = (cert: Certification) => {
    setEditingCertId(cert.id);
    setShowForm(true);
    
    // Format dates for the form
    const formatDate = (date: Date | string | null | undefined) => {
      if (!date) return "";
      return new Date(date).toISOString().split('T')[0];
    };
    
    // Set form values
    setValue("id", cert.id);
    setValue("name", cert.name);
    setValue("issuingAuthority", cert.issuingAuthority);
    setValue("dateIssued", formatDate(cert.dateIssued));
    setValue("expiryDate", formatDate(cert.expiryDate));
    setValue("certificateUrl", cert.certificateUrl || "");
    setValue("status", cert.status as "Active" | "Expired" | "Pending");
  };
  
  const handleDelete = async (certId: string) => {
    if (!window.confirm("Are you sure you want to delete this certification?")) {
      return;
    }
    
    setIsSubmitting(true);
    
    if (isOnline) {
      manageCertificationMutation.mutate({
        token: token!,
        operation: "DELETE",
        certification: { id: certId } as any,
      });
    } else {
      try {
        addOperation({
          operationType: "DELETE",
          modelName: "Certification",
          recordId: certId,
          data: {},
        });
        
        toast.success("Certification deleted. Changes will sync when back online.");
        setIsSubmitting(false);
        onCertificationUpdated();
      } catch (error) {
        toast.error("Failed to delete certification offline");
        setIsSubmitting(false);
      }
    }
  };
  
  const onSubmit = (data: CertificationFormValues) => {
    setIsSubmitting(true);
    
    const operation = editingCertId ? "UPDATE" : "CREATE";
    
    if (isOnline) {
      manageCertificationMutation.mutate({
        token: token!,
        operation,
        certification: data,
      });
    } else {
      try {
        addOperation({
          operationType: operation,
          modelName: "Certification",
          recordId: editingCertId || crypto.randomUUID(),
          data,
        });
        
        toast.success(`Certification ${editingCertId ? 'updated' : 'added'}. Changes will sync when back online.`);
        setIsSubmitting(false);
        setShowForm(false);
        setEditingCertId(null);
        reset();
        onCertificationUpdated();
      } catch (error) {
        toast.error(`Failed to ${editingCertId ? 'update' : 'add'} certification offline`);
        setIsSubmitting(false);
      }
    }
  };
  
  const handleCancel = () => {
    setShowForm(false);
    setEditingCertId(null);
    reset();
  };
  
  // Function to determine badge color based on certification status
  const getStatusBadgeColor = (cert: Certification) => {
    if (cert.isExpired) {
      return "bg-red-100 text-red-800 border-red-200";
    }
    
    if (cert.expiresInDays !== null && cert.expiresInDays !== undefined && cert.expiresInDays < 30) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    
    return "bg-green-100 text-green-800 border-green-200";
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Certifications</h3>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            Add Certification
          </Button>
        )}
      </div>
      
      {/* Certification form */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <h4 className="text-base font-medium text-gray-900 mb-4">
            {editingCertId ? "Edit Certification" : "Add New Certification"}
          </h4>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Certification Name"
                {...register("name")}
                error={errors.name?.message}
                placeholder="e.g., First Aid, CPR, Child Development"
              />
              
              <Input
                label="Issuing Authority"
                {...register("issuingAuthority")}
                error={errors.issuingAuthority?.message}
                placeholder="e.g., Red Cross, State Board"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Issued
                </label>
                <input
                  type="date"
                  {...register("dateIssued")}
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.dateIssued ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.dateIssued && (
                  <p className="mt-1 text-sm text-red-600">{errors.dateIssued.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date (if applicable)
                </label>
                <input
                  type="date"
                  {...register("expiryDate")}
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.expiryDate ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.expiryDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.expiryDate.message}</p>
                )}
              </div>
              
              <Input
                label="Certificate URL (if available)"
                {...register("certificateUrl")}
                error={errors.certificateUrl?.message}
                placeholder="https://example.com/certificate.pdf"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  {...register("status")}
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.status ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Expired">Expired</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
              >
                {editingCertId ? "Update" : "Add"} Certification
              </Button>
            </div>
          </form>
        </div>
      )}
      
      {/* Certifications list */}
      {certifications.length === 0 ? (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No certifications</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first certification.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {certifications.map((cert) => (
            <div key={cert.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center">
                  <h4 className="text-base font-medium text-gray-900">{cert.name}</h4>
                  <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(cert)}`}>
                    {cert.isExpired 
                      ? "Expired" 
                      : cert.expiresInDays !== null && cert.expiresInDays !== undefined && cert.expiresInDays < 30 
                        ? `Expires in ${cert.expiresInDays} days` 
                        : "Active"
                    }
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(cert)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(cert.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-xs font-medium text-gray-500">Issuing Authority</h5>
                    <p className="text-sm text-gray-900">{cert.issuingAuthority}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-gray-500">Date Issued</h5>
                    <p className="text-sm text-gray-900">
                      {new Date(cert.dateIssued).toLocaleDateString()}
                    </p>
                  </div>
                  {cert.expiryDate && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-500">Expiry Date</h5>
                      <p className="text-sm text-gray-900">
                        {new Date(cert.expiryDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {cert.certificateUrl && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-500">Certificate</h5>
                      <a 
                        href={cert.certificateUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View Certificate
                      </a>
                    </div>
                  )}
                </div>
                
                {/* Certification progress visualization */}
                {cert.expiryDate && !cert.isExpired && (
                  <div className="mt-4">
                    <h5 className="text-xs font-medium text-gray-500 mb-1">Validity Period</h5>
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                        <div 
                          style={{ 
                            width: `${Math.min(100, Math.max(0, calculateProgress(cert)))}%` 
                          }}
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                            cert.expiresInDays !== null && cert.expiresInDays !== undefined && cert.expiresInDays < 30
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to calculate progress percentage for certification validity
function calculateProgress(cert: Certification): number {
  if (!cert.expiryDate || !cert.dateIssued) return 0;
  
  const start = new Date(cert.dateIssued).getTime();
  const end = new Date(cert.expiryDate).getTime();
  const now = new Date().getTime();
  
  // Total duration in milliseconds
  const totalDuration = end - start;
  // Elapsed time in milliseconds
  const elapsedTime = now - start;
  
  // Calculate percentage remaining (inverted)
  const percentageElapsed = (elapsedTime / totalDuration) * 100;
  return 100 - percentageElapsed;
}
