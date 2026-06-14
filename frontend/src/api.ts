import axios from 'axios';

export interface Patient {
  id: string;
  name: string;
  dob: string;
  gender: string;
}

export interface ICDCode {
  code: string;
  description: string;
}

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icdCodes?: ICDCode[];
}

export interface Session {
  id: string;
  patientName: string;
  patientDob: string;
  patientGender: string;
  date: string;
  status: 'Recording' | 'Transcribing' | 'Ready' | 'Reviewed';
  audioUrl?: string;
  transcript?: string;
  soapNote?: SOAPNote;
}

// Default base URL for backend API
const DEFAULT_API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000' 
  : `${window.location.protocol}//${window.location.hostname}:8000`;

export const getApiUrl = (): string => {
  return localStorage.getItem('scribe_api_url') || DEFAULT_API_URL;
};

export const setApiUrl = (url: string) => {
  localStorage.setItem('scribe_api_url', url);
};

export const getUseMock = (): boolean => {
  const stored = localStorage.getItem('scribe_use_mock');
  return stored !== 'false'; // Default to true for testing and robust operation
};

export const setUseMock = (useMock: boolean) => {
  localStorage.setItem('scribe_use_mock', String(useMock));
};

// Initial Mock Data
const INITIAL_MOCK_SESSIONS: Session[] = [
  {
    id: 's-1',
    patientName: 'John Doe',
    patientDob: '1978-05-14',
    patientGender: 'Male',
    date: '2026-06-12 10:15 AM',
    status: 'Reviewed',
    transcript: `Doctor: Good morning, John. How are we doing today?
Patient: Hi, Dr. Miller. Honestly, my lower back has been killing me for the last week.
Doctor: I'm sorry to hear that. Where exactly is the pain, and how would you describe it?
Patient: It's right in the center of my lower back, but sometimes it shoots down into my left buttock and thigh. It's a sharp, burning pain. I'd say it's about a 7 out of 10 today.
Doctor: Does anything make it better or worse?
Patient: Sitting down makes it worse, especially at my desk. Walking around helps a little, but standing still is painful. Ibuprofen 400mg barely touches it.
Doctor: Let's do a quick physical exam. Please lie back on the table. I'm going to raise your left leg... any pain?
Patient: Ouch! Yes, right there. It shoots down my leg.
Doctor: Okay, positive straight leg raise on the left at about 35 degrees. Normal on the right. Deep tendon reflexes at the patella and Achilles are 2+ and symmetric. Lumbar paraspinal muscles are quite tender to palpation on the left side.
Doctor: I think you have lumbar radiculopathy, likely due to a mild disc herniation at L4-L5 or L5-S1. I'm going to prescribe physical therapy twice a week for six weeks, and let's start you on Gabapentin 300mg at night to help with the nerve pain. Let's also order an MRI if it doesn't improve.
Patient: Okay, thank you Doctor. I will schedule the PT.`,
    soapNote: {
      subjective: `Chief Complaint: Lower back pain radiating to left leg for 1 week.
History of Present Illness:
The patient is a 48-year-old male who presents with sharp, burning pain in the lumbar spine (7/10 severity) radiating into the left buttock and posterior thigh. Symptoms are exacerbated by prolonged sitting and improved slightly with ambulation. Over-the-counter Ibuprofen 400mg provides minimal relief. No bowel or bladder dysfunction, saddle anesthesia, or progressive motor weakness reported.`,
      objective: `Physical Exam:
- Gait: Antalgic, favoring the left side.
- Lumbar Spine: Mild focal tenderness over the left lumbar paraspinal muscles (L4-S1 region). Reduced range of motion in flexion due to pain.
- Straight Leg Raise (SLR): Positive on the left at 35 degrees, producing radicular pain radiating below the knee. Negative on the right.
- Neurological: Deep tendon reflexes (DTR) are 2+ and symmetric at the patella and Achilles bilaterally. Sensation is intact to light touch in L4, L5, and S1 dermatomes bilaterally. Motor strength is 5/5 in lower extremities bilaterally.`,
      assessment: `1. Lumbar Radiculopathy (M54.16) - Suspected lumbar disc displacement/herniation at L4-L5 or L5-S1.
2. Low Back Pain (M54.50)`,
      plan: `1. Medications: Start Gabapentin 300 mg PO QHS for neuropathic pain. May increase to TID if needed.
2. Therapy: Refer to Physical Therapy for lumbar stabilization and core strengthening (2x/week for 6 weeks).
3. Imaging: Order Lumbar Spine MRI if symptoms persist or worsen after 4-6 weeks of conservative management.
4. Red Flags: Counseled patient on red flag symptoms (bowel/bladder incontinence, saddle anesthesia, acute weakness) and advised to proceed to the ER if any occur.
5. Follow-up: Return to clinic in 3-4 weeks to assess progress.`,
      icdCodes: [
        { code: 'M54.16', description: 'Radiculopathy, lumbar region' },
        { code: 'M54.50', description: 'Low back pain, unspecified' },
        { code: 'M51.26', description: 'Other intervertebral disc displacement, lumbar region' }
      ]
    }
  },
  {
    id: 's-2',
    patientName: 'Sarah Jenkins',
    patientDob: '1992-11-23',
    patientGender: 'Female',
    date: '2026-06-12 11:30 AM',
    status: 'Ready',
    transcript: `Doctor: Hello Sarah, what brings you in today?
Patient: Hello, Doctor. I've had this terrible sore throat and a fever since yesterday morning.
Doctor: I see. Are you experiencing any other symptoms, like a cough, runny nose, or body aches?
Patient: No cough at all. Just a severe headache, some chills, and it really hurts to swallow. My temperature was 101.4 at home.
Doctor: Let's take a look. Your temperature here is 101.2 F. Looking in your throat, your tonsils are quite red and swollen with some white spots, what we call exudates. Your neck glands, the cervical lymph nodes, are also tender and swollen.
Doctor: Because you have fever, tonsillar exudate, tender neck lymph nodes, and no cough, you have a high probability of strep throat. I'm going to run a rapid strep test right now.
Patient: Okay. Let's do that.
Doctor: *Swabs throat* ... Alright, the rapid strep test came back positive. This confirms Group A Streptococcal Pharyngitis. I will prescribe a 10-day course of Amoxicillin 500mg twice a day. Make sure you finish the entire bottle, even if you feel better.
Patient: Got it. Can I take Tylenol for the pain?
Doctor: Yes, Acetaminophen or Ibuprofen as needed for pain and fever. Get plenty of rest and fluids. You should be non-contagious 24 hours after starting antibiotics.`,
    soapNote: {
      subjective: `Chief Complaint: Sore throat and fever for 24 hours.
History of Present Illness:
The patient is a 33-year-old female presenting with acute onset of severe sore throat, painful swallowing (odynophagia), subjective fever, chills, and headache. She denies cough, rhinorrhea, nasal congestion, or shortness of breath. Checked temperature at home was 101.4 F.`,
      objective: `Physical Exam:
- Vital Signs: Temp 101.2 F, BP 118/76, HR 84, RR 14, SpO2 99% on room air.
- HEENT: Oropharynx shows bilateral tonsillar hypertrophy (3+) with marked erythema and white follicular tonsillar exudates. No uvular deviation. Cobblestoning of posterior pharynx absent.
- Neck: Tender anterior cervical lymphadenopathy bilaterally, larger on the left side.
- Lungs: Clear to auscultation bilaterally, no wheezes or rales.
- Diagnostic Tests: Rapid Antigen Detection Test (RADT) for Group A Strep: Positive.`,
      assessment: `1. Acute Streptococcal Pharyngitis (J03.00) - Confirmed by rapid strep test.
2. Fever (R50.9)`,
      plan: `1. Medications:
   - Amoxicillin 500 mg PO BID for 10 days (finish complete course).
   - Acetaminophen 500-1000 mg PO every 6 hours as needed for fever/throat pain (not to exceed 3g/day).
2. Education: Stay home from work/social activities until on antibiotics for at least 24 hours and afebrile. Avoid sharing utensils/cups.
3. Hydration & Rest: Encourage warm liquids, lozenges, and salt-water gargles.
4. Follow-up: Return if symptoms do not improve in 48-72 hours, or if experiencing difficulty breathing or managing secretions.`,
      icdCodes: [
        { code: 'J03.00', description: 'Acute streptococcal tonsillitis, unspecified' },
        { code: 'R50.9', description: 'Fever, unspecified' },
        { code: 'R07.0', description: 'Pain in throat' }
      ]
    }
  },
  {
    id: 's-3',
    patientName: 'Robert Martinez',
    patientDob: '1961-02-03',
    patientGender: 'Male',
    date: '2026-06-11 02:00 PM',
    status: 'Ready',
    transcript: `Doctor: Hello Robert, we are reviewing your blood pressure today. How has it been going?
Patient: Hi Dr. Miller. I've been taking the Lisinopril 10mg every day as prescribed, but I've been checking my pressure at home and it still seems a bit high, usually around 145 over 92.
Doctor: I see. Are you having any symptoms like headaches, chest pain, shortness of breath, or changes in vision?
Patient: No, I feel perfectly fine. No headaches or anything.
Doctor: Let's check it today. Yes, it's 148 over 94 in your right arm. Your heart rate is 72 and regular. Your lungs are clear and there's no peripheral edema in your legs.
Doctor: It looks like the Lisinopril 10mg is not quite getting you to our target of under 130 over 80. Since you tolerate the Lisinopril well and haven't had any cough, we can increase the dose to Lisinopril 20mg daily. We should also discuss lifestyle: how is your salt intake and exercise?
Patient: I've been trying to cut back on salt, but it's hard. I walk about 15 minutes a day.
Doctor: Excellent, let's try to increase that walk to 30 minutes, and really watch the processed foods which have high sodium. We will increase Lisinopril to 20mg and check a basic metabolic panel in 2 weeks to monitor your kidney function and potassium.
Patient: Sounds good, Doctor.`,
    soapNote: {
      subjective: `Chief Complaint: Blood pressure follow-up.
History of Present Illness:
The patient is a 65-year-old male who presents for follow-up of Essential Hypertension. He reports compliance with Lisinopril 10mg daily. Home blood pressure logs average 145/92 mmHg. He denies any associated symptoms including headaches, chest pain, dyspnea, lightheadedness, or visual disturbances. Adheres to a moderate walking regimen (15 mins/day) and reports ongoing efforts to reduce dietary sodium.`,
      objective: `Physical Exam:
- Vital Signs: BP 148/94 mmHg (confirmed bilaterally), HR 72 bpm (regular), Temp 98.2 F.
- Cardiovascular: Regular rate and rhythm. Normal S1, S2. No murmurs, gallops, or rubs.
- Lungs: Clear to auscultation bilaterally.
- Extremities: No lower extremity edema bilaterally.
- Neck: No carotid bruits. Jugular venous pressure is normal.`,
      assessment: `1. Essential Hypertension, uncontrolled on single-agent therapy (I10) - Suboptimal control on Lisinopril 10mg daily.
2. Counseling on Diet and Exercise (Z71.3)`,
      plan: `1. Medications: Increase Lisinopril to 20 mg PO daily.
2. Labs: Order Basic Metabolic Panel (BMP) in 2 weeks to monitor serum potassium, BUN, and creatinine.
3. Lifestyle:
   - Increase aerobic exercise to 30 minutes of brisk walking daily.
   - Dietary counseling: Reinforce DASH (Dietary Approaches to Stop Hypertension) diet, aiming for <2,000 mg of sodium daily.
4. Home Monitoring: Continue daily blood pressure logs and bring log to next appointment.
5. Follow-up: Return to clinic in 4 weeks for repeat blood pressure check.`,
      icdCodes: [
        { code: 'I10', description: 'Essential (primary) hypertension' },
        { code: 'Z71.3', description: 'Dietary counseling and surveillance' }
      ]
    }
  }
];

// Helper to load/save sessions in localStorage
const getSavedSessions = (): Session[] => {
  const stored = localStorage.getItem('scribe_sessions');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing saved sessions', e);
    }
  }
  localStorage.setItem('scribe_sessions', JSON.stringify(INITIAL_MOCK_SESSIONS));
  return INITIAL_MOCK_SESSIONS;
};

const saveSessions = (sessions: Session[]) => {
  localStorage.setItem('scribe_sessions', JSON.stringify(sessions));
};

export const api = {
  // Get all sessions
  getSessions: async (): Promise<Session[]> => {
    if (getUseMock()) {
      return getSavedSessions();
    }
    const res = await axios.get(`${getApiUrl()}/api/sessions`);
    return res.data;
  },

  // Create a new session
  createSession: async (patient: Omit<Session, 'id' | 'date' | 'status'>): Promise<Session> => {
    const newSession: Session = {
      ...patient,
      id: `s-${Date.now()}`,
      date: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      status: 'Recording'
    };

    if (getUseMock()) {
      const sessions = getSavedSessions();
      sessions.unshift(newSession);
      saveSessions(sessions);
      return newSession;
    }

    const res = await axios.post(`${getApiUrl()}/api/sessions`, {
      patientName: patient.patientName,
      patientDob: patient.patientDob,
      patientGender: patient.patientGender
    });
    return res.data;
  },

  // Update a session (e.g. status, transcript, soapNote)
  updateSession: async (id: string, updates: Partial<Session>): Promise<Session> => {
    if (getUseMock()) {
      const sessions = getSavedSessions();
      const idx = sessions.findIndex(s => s.id === id);
      if (idx !== -1) {
        sessions[idx] = { ...sessions[idx], ...updates };
        saveSessions(sessions);
        return sessions[idx];
      }
      throw new Error('Session not found');
    }

    const res = await axios.put(`${getApiUrl()}/api/sessions/${id}`, updates);
    return res.data;
  },

  // Delete a session
  deleteSession: async (id: string): Promise<void> => {
    if (getUseMock()) {
      const sessions = getSavedSessions();
      const filtered = sessions.filter(s => s.id !== id);
      saveSessions(filtered);
      return;
    }

    await axios.delete(`${getApiUrl()}/api/sessions/${id}`);
  },

  // Upload Audio file for transcription and note generation
  uploadAudio: async (id: string, audioFile: File): Promise<Session> => {
    if (getUseMock()) {
      // Transition to transcribing
      const sessions = getSavedSessions();
      const idx = sessions.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Session not found');

      sessions[idx].status = 'Transcribing';
      saveSessions(sessions);

      // Simulate network & AI processing delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      const updatedSessions = getSavedSessions();
      const updateIdx = updatedSessions.findIndex(s => s.id === id);
      if (updateIdx === -1) throw new Error('Session not found');

      // Fill in beautiful, structured medical data
      const patientName = updatedSessions[updateIdx].patientName;

      updatedSessions[updateIdx].status = 'Ready';
      updatedSessions[updateIdx].transcript = `Doctor: Hello ${patientName}, how are you doing today?
Patient: Well, Doctor, I've had this persistent dry cough and some mild shortness of breath for about two weeks now. No fever, but I feel tired all the time.
Doctor: I see. Have you had any runny nose, chest pain, or wheezing? Any history of asthma?
Patient: No asthma, and no chest pain. It just feels hard to take a deep breath sometimes, and this dry cough is keeping me up at night. I tried some over-the-counter cough syrup but it didn't help.
Doctor: Alright, let's do an examination. Take deep breaths in and out... okay, I hear some mild expiratory wheezing in both lower lung fields. Heart rate is regular, and your oxygen saturation is 95% on room air, which is a little on the lower side of normal.
Doctor: I think we're dealing with acute bronchitis, possibly with some hyperreactive airways. I'm going to prescribe an Albuterol inhaler to use every 4 to 6 hours as needed for the wheezing and shortness of breath. We will also start you on a brief course of oral Prednisone to calm down the airway inflammation.
Patient: Okay, will that help with the cough too?
Doctor: Yes, the Prednisone should reduce the coughing significantly. Let's also get a chest X-ray just to make sure there's no underlying pneumonia, especially given the two-week duration.
Patient: Thank you, Doctor, I will get that done today.`;

      updatedSessions[updateIdx].soapNote = {
        subjective: `Chief Complaint: Dry cough and shortness of breath for 2 weeks.
History of Present Illness:
The patient is a ${updatedSessions[updateIdx].patientGender.toLowerCase()} presenting with a 14-day history of non-productive, dry cough and progressive mild exertional dyspnea. Associated with generalized fatigue. Denies subjective fever, chills, rhinorrhea, sore throat, or chest pain. No personal or family history of asthma or reactive airway disease. Over-the-counter antitussives have failed to provide relief.`,
        objective: `Physical Exam:
- Vital Signs: BP 122/80, HR 78, RR 16, Temp 98.6 F, SpO2 95% on room air.
- HEENT: Mucous membranes moist, no pharyngeal erythema or tonsillar hypertrophy.
- Cardiovascular: Regular rate and rhythm, normal S1 and S2. No murmurs or gallops.
- Lungs: Mild expiratory wheezing present bilaterally in the lower lung fields. No rales, crackles, or rhonchi. Expiratory phase is slightly prolonged. Symmetrical chest expansion.`,
        assessment: `1. Acute Bronchitis, unspecified (J20.9) - Prominent dry cough and bilateral expiratory wheezing.
2. Reactive Airway Disease / Bronchospasm (J45.909) - Expiratory wheezing with borderline SpO2.
3. Cough (R05.9)`,
        plan: `1. Medications:
   - Albuterol 90 mcg HFA Inhaler: 2 puffs inhaled every 4-6 hours as needed for wheezing or shortness of breath.
   - Prednisone 40 mg PO daily for 5 days to reduce airway inflammation.
2. Diagnostics: Order a single-view chest X-ray (CXR) today to rule out atypical pneumonia.
3. Education: Advise on hydration, use of a humidifier, and avoiding airway irritants (such as smoke).
4. Red Flags: Instructed to seek emergency care if experiencing severe shortness of breath, chest pain, bluish lips, or a spike in fever > 101.5 F.
5. Follow-up: Call the clinic in 48-72 hours if no improvement, or return in 1 week for a clinical recheck.`,
        icdCodes: [
          { code: 'J20.9', description: 'Acute bronchitis, unspecified' },
          { code: 'J45.909', description: 'Unspecified asthma, uncomplicated' },
          { code: 'R05.9', description: 'Cough, unspecified' }
        ]
      };

      saveSessions(updatedSessions);
      return updatedSessions[updateIdx];
    }

    const formData = new FormData();
    formData.append('file', audioFile);
    const res = await axios.post(`${getApiUrl()}/api/sessions/${id}/audio`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  }
};
