function mapRole(role) {
    if (role === 'PATIENT') {
        return 'patient';
    }
    if (role === 'DOCTOR') {
        return 'doctor';
    }
    return 'admin';
}
export function serializeUser(user) {
    return {
        id: user.id,
        role: mapRole(user.role),
        fullName: user.fullName,
        email: user.email,
        age: user.age ?? undefined,
        specialty: user.specialty ?? undefined,
        about: user.about ?? undefined
    };
}
export function serializeLesson(lesson) {
    return {
        id: lesson.id,
        weekNumber: 0,
        title: lesson.title,
        description: lesson.description,
        date: lesson.date.toISOString().slice(0, 10),
        audioUrl: lesson.audioUrl,
        durationMin: lesson.durationMin
    };
}
export function serializeWeek(week, lessons) {
    return {
        id: week.id,
        weekNumber: week.weekNumber,
        title: week.title,
        lessons: lessons.map((lesson) => ({
            ...serializeLesson(lesson),
            weekNumber: week.weekNumber
        }))
    };
}
export function serializeMessage(message) {
    return {
        id: message.id,
        fromId: message.fromId,
        toId: message.toId,
        text: message.text,
        createdAt: message.createdAt.toISOString()
    };
}
export function serializeReferral(referral) {
    return {
        id: referral.id,
        code: referral.code,
        doctorId: referral.doctorId,
        active: referral.active,
        usedByPatientId: referral.usedByPatientId ?? undefined,
        createdAt: referral.createdAt.toISOString()
    };
}
export function serializeLink(link) {
    return {
        doctorId: link.doctorId,
        patientId: link.patientId
    };
}
