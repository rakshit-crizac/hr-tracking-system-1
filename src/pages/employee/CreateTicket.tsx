import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fetchCategories, createTicket, fetchSLAPolicy } from '../../services/ticketService';
import { formatSLATime } from '../../services/slaService';
import { Category, TicketPriority, SLAPolicy, Ticket } from '../../types';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Clock,
  Shield,
  FileText,
  Paperclip,
  Info,
  ArrowLeft,
  Ticket as TicketIcon,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';

const priorities: { value: TicketPriority; label: string; description: string; color: string }[] = [
  { value: 'low', label: 'Low', description: 'General queries, no urgency', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'medium', label: 'Medium', description: 'Standard requests', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'high', label: 'High', description: 'Time-sensitive matters', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'critical', label: 'Critical', description: 'Urgent, immediate attention needed', color: 'bg-red-100 text-red-700 border-red-200' },
];

const categoryPlaceholders: Record<string, string> = {
  'leave': 'Please specify:\n- Type of leave (annual, sick, personal, etc.)\n- Start and end dates\n- Reason for leave (if applicable)\n- Any handover notes',
  'payroll': 'Please describe:\n- Nature of the payroll issue\n- Pay period affected\n- Any discrepancies noticed\n- Relevant employee ID or reference',
  'benefits': 'Please include:\n- Type of benefit inquiry\n- Specific questions or concerns\n- Any relevant dates or deadlines',
  'onboarding': 'Please provide:\n- New employee name and start date\n- Department and role\n- Any specific requirements or setup needs',
  'offboarding': 'Please specify:\n- Employee name and last working day\n- Handover requirements\n- Access and equipment to be recovered',
  'policy': 'Please describe:\n- Which policy you need clarification on\n- Specific questions or scenarios\n- Any relevant context',
  'posh': 'Your concern will be handled with utmost confidentiality.\n\nPlease provide:\n- Nature of the concern (as much detail as you are comfortable sharing)\n- When and where the incident(s) occurred\n- Any witnesses (if applicable)',
  'default': 'Please provide detailed information about your request including:\n- What you need help with\n- Any relevant dates or deadlines\n- Background context that might be helpful',
};

type FormStep = 'category' | 'details' | 'review' | 'success';

export function CreateTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<FormStep>('category');
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const [slaPolicy, setSlaPolicy] = useState<SLAPolicy | null>(null);
  const [loadingSLA, setLoadingSLA] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    subcategory_id: '',
    priority: 'medium' as TicketPriority,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (formData.category_id && formData.priority) {
      loadSLAPolicy();
    }
  }, [formData.category_id, formData.priority]);

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const loadSLAPolicy = async () => {
    setLoadingSLA(true);
    try {
      const policy = await fetchSLAPolicy(formData.category_id, formData.priority);
      setSlaPolicy(policy);
    } catch (error) {
      console.error('Failed to load SLA policy:', error);
    } finally {
      setLoadingSLA(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === formData.category_id);
  const subcategories = selectedCategory?.subcategories?.filter((s) => s.is_active) || [];
  const selectedSubcategory = subcategories.find(s => s.id === formData.subcategory_id);

  const descriptionPlaceholder = useMemo(() => {
    if (!selectedCategory) return categoryPlaceholders.default;
    const code = selectedCategory.code.toLowerCase();
    return categoryPlaceholders[code] || categoryPlaceholders.default;
  }, [selectedCategory]);

  const handleCategorySelect = (categoryId: string) => {
    setFormData({ ...formData, category_id: categoryId, subcategory_id: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setSubmitting(true);

    try {
      const ticket = await createTicket(
        {
          title: formData.title,
          description: formData.description,
          category_id: formData.category_id,
          subcategory_id: formData.subcategory_id || undefined,
          priority: formData.priority,
        },
        user
      );

      setCreatedTicket(ticket);
      setStep('success');
    } catch (error) {
      console.error('Failed to create ticket:', error);
      setError('Failed to create ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedToDetails = formData.category_id !== '';
  const canProceedToReview = formData.title.trim() !== '' && formData.description.trim() !== '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (step === 'success' && createdTicket) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-8 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Ticket Created Successfully!</h2>
            <p className="text-green-100">Your request has been submitted to HR</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TicketIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ticket Number</p>
                  <p className="text-xl font-bold text-gray-900">{createdTicket.ticket_number}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium text-gray-900">{selectedCategory?.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Priority</p>
                  <p className="font-medium text-gray-900 capitalize">{formData.priority}</p>
                </div>
                <div>
                  <p className="text-gray-500">Submitted On</p>
                  <p className="font-medium text-gray-900">{format(new Date(), 'MMM d, yyyy h:mm a')}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {createdTicket.status === 'assigned' ? 'Assigned to Agent' : 'Open'}
                  </span>
                </div>
              </div>
            </div>

            {slaPolicy && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Our Commitment to You
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700">First acknowledgement within</span>
                    <span className="font-medium text-blue-900">{formatSLATime(slaPolicy.acknowledgement_hours)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700">Full resolution within</span>
                    <span className="font-medium text-blue-900">{formatSLATime(slaPolicy.resolution_hours)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h3 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                What Happens Next?
              </h3>
              <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
                <li>An HR representative will review your request</li>
                <li>You'll receive updates via email and in your portal</li>
                <li>You can track progress and add comments anytime</li>
              </ol>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/tickets/${createdTicket.id}`)}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                View Ticket Details
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/tickets')}
                className="px-4 py-3 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Go to My Tickets
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          {step !== 'category' && (
            <button
              onClick={() => setStep(step === 'review' ? 'details' : 'category')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Raise a New Ticket</h1>
            <p className="text-gray-500 mt-1">Submit your HR request and we'll get back to you</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          {['category', 'details', 'review'].map((s, index) => (
            <div key={s} className="flex items-center">
              {index > 0 && <div className="w-8 h-px bg-gray-300 mx-1" />}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  step === s
                    ? 'bg-blue-100 text-blue-700'
                    : ['category', 'details', 'review'].indexOf(step) > index
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                  {['category', 'details', 'review'].indexOf(step) > index ? '✓' : index + 1}
                </span>
                <span className="capitalize">{s}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {step === 'category' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">What do you need help with?</h2>
          <p className="text-sm text-gray-500 mb-6">Select the category that best describes your request</p>

          <div className="grid gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  formData.category_id === category.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${
                    category.is_sensitive ? 'bg-amber-100' : 'bg-gray-100'
                  }`}>
                    {category.is_sensitive ? (
                      <Shield className="w-5 h-5 text-amber-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{category.name}</span>
                      {category.is_sensitive && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Confidential</span>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                    )}
                  </div>
                  <ChevronRight className={`w-5 h-5 transition-colors ${
                    formData.category_id === category.id ? 'text-blue-500' : 'text-gray-300'
                  }`} />
                </div>
              </button>
            ))}
          </div>

          {subcategories.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Select a more specific category (optional)</h3>
              <div className="flex flex-wrap gap-2">
                {subcategories.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setFormData({ ...formData, subcategory_id: sub.id })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.subcategory_id === sub.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedCategory?.is_sensitive && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Confidential Handling</p>
                  <p className="text-sm text-amber-700 mt-1">
                    This is a sensitive category. Your request will be handled by specially trained personnel
                    with strict confidentiality protocols.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep('details')}
              disabled={!canProceedToDetails}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'details' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className={`p-2 rounded-lg ${selectedCategory?.is_sensitive ? 'bg-amber-100' : 'bg-blue-100'}`}>
              {selectedCategory?.is_sensitive ? (
                <Shield className="w-5 h-5 text-amber-600" />
              ) : (
                <FileText className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{selectedCategory?.name}</p>
              {selectedSubcategory && (
                <p className="text-sm text-gray-500">{selectedSubcategory.name}</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief summary of your request"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-500">{formData.title.length}/200 characters</p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={descriptionPlaceholder}
                rows={8}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Priority <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {priorities.map((p) => (
                  <label
                    key={p.value}
                    className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.priority === p.value
                        ? `border-blue-500 ${p.color}`
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={p.value}
                      checked={formData.priority === p.value}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value as TicketPriority })
                      }
                      className="sr-only"
                    />
                    <div>
                      <span className="block text-sm font-medium">{p.label}</span>
                      <span className="block text-xs opacity-75 mt-0.5">{p.description}</span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600">
                  <strong>Priority Guide:</strong> Please select the priority that accurately reflects your need.
                  High/Critical priorities are for genuinely urgent matters. Misuse may result in slower overall response times.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Attachments
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer">
                <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Drag and drop files here, or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOC, JPG, PNG up to 10MB each</p>
              </div>
              <p className="mt-2 text-xs text-gray-500 italic">
                Attachment functionality coming soon
              </p>
            </div>

            {slaPolicy && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" />
                  Expected Response Time
                </h4>
                {loadingSLA ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <p className="text-sm text-blue-700">
                    Based on your selected category and priority, we aim to acknowledge your request within{' '}
                    <strong>{formatSLATime(slaPolicy.acknowledgement_hours)}</strong> and resolve it within{' '}
                    <strong>{formatSLATime(slaPolicy.resolution_hours)}</strong>.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between">
            <button
              onClick={() => setStep('category')}
              className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setStep('review')}
              disabled={!canProceedToReview}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Review & Submit
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Review Your Request</h2>
          <p className="text-sm text-gray-500 mb-6">Please review the information below before submitting</p>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Category</p>
                  <p className="font-medium text-gray-900">{selectedCategory?.name}</p>
                  {selectedSubcategory && (
                    <p className="text-sm text-gray-500">{selectedSubcategory.name}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Priority</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium ${
                    priorities.find(p => p.value === formData.priority)?.color
                  }`}>
                    {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Requester</p>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    {user?.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date</p>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {format(new Date(), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Subject</p>
              <p className="font-medium text-gray-900">{formData.title}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Description</p>
              <p className="text-gray-900 whitespace-pre-wrap">{formData.description}</p>
            </div>

            {slaPolicy && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  SLA Commitment
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-700">Acknowledgement</p>
                    <p className="font-medium text-green-900">{formatSLATime(slaPolicy.acknowledgement_hours)}</p>
                  </div>
                  <div>
                    <p className="text-green-700">Resolution Target</p>
                    <p className="font-medium text-green-900">{formatSLATime(slaPolicy.resolution_hours)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between">
            <button
              type="button"
              onClick={() => setStep('details')}
              className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Edit Details
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Ticket...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Submit Ticket
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
