import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Download, Lock, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function CourseCertificate({ course, progress, isEnrolled, needsPayment }) {
  const [showModal, setShowModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const certificateRef = useRef(null);

  // Check if course is completed
  const isCompleted = progress && progress.percentage >= 100;
  const isLocked = !isEnrolled || needsPayment || !isCompleted;

  const completionDate = progress?.completed_at 
    ? new Date(progress.completed_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

  const generatePDF = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert('Please enter both first name and last name');
      return;
    }

    setIsGenerating(true);

    try {
      const element = certificateRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${firstName}_${lastName}_${course.title.replace(/\s+/g, '_')}_Certificate.pdf`);
      
      setShowModal(false);
      setFirstName('');
      setLastName('');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate certificate. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getLockMessage = () => {
    if (!isEnrolled) return 'Enroll in this course to unlock certificate';
    if (needsPayment) return 'Complete payment to unlock certificate';
    if (!isCompleted) return `Complete all lessons to unlock certificate (${progress?.percentage || 0}% done)`;
    return '';
  };

  return (
    <>
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-light-primary dark:text-dark-primary" />
            <h4 className="font-semibold">Certificate</h4>
          </div>
          {isLocked && <Lock className="h-4 w-4 text-gray-400" />}
        </div>

        {isLocked ? (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
            <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getLockMessage()}
            </p>
          </div>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-gradient-to-r from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Award className="h-5 w-5" />
            Get Certificate
          </button>
        )}
      </div>

      {/* Certificate Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary text-white p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">Course Certificate</h2>
                  <p className="text-sm opacity-90">{course.title}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-4 sm:p-6">
                {/* Input Form */}
                <div className="mb-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">First Name *</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter first name"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Last Name *</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter last name"
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                {/* Certificate Preview */}
                <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 mb-6">
                  <div 
                    ref={certificateRef}
                    className="relative w-full aspect-[1.414/1] bg-white shadow-2xl mx-auto"
                    style={{ maxWidth: '800px' }}
                  >
                    {/* Certificate Background Design */}
                    <div className="absolute inset-0">
                      {/* Top Left Corner */}
                      <div className="absolute top-0 left-0 w-1/3 h-1/3">
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-600 to-teal-700 transform -skew-y-12 origin-top-left"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-500 transform -skew-y-12 origin-top-left" style={{ top: '8px', left: '8px' }}></div>
                      </div>

                      {/* Bottom Right Corner */}
                      <div className="absolute bottom-0 right-0 w-1/3 h-1/3">
                        <div className="absolute inset-0 bg-gradient-to-tl from-teal-600 to-teal-700 transform skew-y-12 origin-bottom-right"></div>
                        <div className="absolute inset-0 bg-gradient-to-tl from-yellow-400 to-yellow-500 transform skew-y-12 origin-bottom-right" style={{ bottom: '8px', right: '8px' }}></div>
                      </div>

                      {/* Best Award Badge */}
                      <div className="absolute top-8 right-12">
                        <div className="relative w-20 h-20">
                          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full"></div>
                          <div className="absolute inset-2 bg-teal-700 rounded-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-yellow-400 text-xs font-bold">BEST</div>
                              <div className="text-yellow-400 text-xs font-bold">AWARD</div>
                              <div className="flex justify-center gap-0.5 mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className="text-yellow-400 text-xs">★</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Certificate Content */}
                    <div className="relative z-10 flex flex-col items-center justify-center h-full px-16 py-12">
                      <div className="text-center space-y-4 w-full">
                        <div>
                          <h1 className="text-5xl font-bold text-gray-800 tracking-wider">CERTIFICATE</h1>
                          <p className="text-xl text-gray-400 tracking-widest mt-2">OF EXCELLENCE</p>
                        </div>

                        <div className="mt-6">
                          <p className="text-sm font-semibold text-gray-700 tracking-wider">
                            THIS CERTIFICATE IS PROUDLY PRESENTED TO
                          </p>
                        </div>

                        <div className="my-6">
                          <p className="text-5xl font-serif text-teal-700 italic">
                            {firstName && lastName ? `${firstName} ${lastName}` : 'Your Name'}
                          </p>
                        </div>

                        <div className="max-w-2xl mx-auto">
                          <p className="text-sm text-gray-500 italic leading-relaxed">
                            For successfully completing the <span className="font-semibold text-gray-700 uppercase">{course.difficulty || 'INTERMEDIATE'}</span> level course <span className="font-semibold text-gray-700">"{course.title}"</span> and demonstrating exceptional dedication, commitment, and excellence in their learning journey.
                          </p>
                        </div>

                        <div className="flex justify-center gap-32 mt-10">
                          <div className="text-center">
                            <div className="border-t-2 border-gray-300 pt-2 px-8">
                              <p className="text-xs font-semibold text-gray-700 tracking-wider">DATE</p>
                              <p className="text-sm text-gray-600 mt-1">{completionDate}</p>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="border-t-2 border-gray-300 pt-2 px-8">
                              <p className="text-xs font-semibold text-gray-700 tracking-wider">SIGNATURE</p>
                              <p className="text-sm text-gray-600 mt-1 font-serif italic">EdgeIQ Team</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Download Button */}
                <button
                  onClick={generatePDF}
                  disabled={isGenerating || !firstName.trim() || !lastName.trim()}
                  className="w-full btn-primary py-4 text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      Download Certificate (PDF)
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
