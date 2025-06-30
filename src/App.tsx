import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  SkipForward,
  Calendar,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  GripVertical,
  Database,
  Save,
  X,
  Search,
} from "lucide-react";

import {
  loginAnon,
  getAllExercises,
  getAllTemplates,
  saveExercise,
  deleteExercise,
  saveTemplate,
  deleteTemplate,
  addWorkoutResult,
} from "./firebase";

import NumberSelect from "./Numberselect";
import RestTimer from "./RestTimer";

function getFallbackImage(e: any) {
  e.target.onerror = null;
  e.target.src = "https://cdn-icons-png.flaticon.com/512/147/147144.png";
}

// Функция для автоматического расчета длительности тренировки
function calculateDuration(exercises: any[]) {
  let totalSeconds = 0;
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    if (!ex) continue;
    const sets = ex.sets || 1;
    const reps = ex.reps || 1;
    const rest = ex.rest || 60;
    const setTime = reps * 7;
    totalSeconds += sets * setTime;
    // Между подходами
    totalSeconds += (sets - 1) * rest;
    // После последнего подхода, если это не последнее упражнение
    if (i < exercises.length - 1) {
      totalSeconds += rest;
    }
  }
  return Math.round(totalSeconds / 60);
}

// ========== Главный компонент ==========
export default function App() {
  // Все хуки В САМОМ НАЧАЛЕ!
  const [currentScreen, setCurrentScreen] = useState("main");
  const [step, setStep] = useState("choose");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [actualReps, setActualReps] = useState(1);
  const [actualWeight, setActualWeight] = useState(0);
  const [resting, setResting] = useState(false);
  const [restPaused, setRestPaused] = useState(false);
  const [allExercises, setAllExercises] = useState<any>({});
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateExercises, setNewTemplateExercises] = useState<string[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExercises, setEditingExercises] = useState<any[]>([]);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [workoutResults, setWorkoutResults] = useState<any[]>([]);
  const [currentWorkoutStartTime, setCurrentWorkoutStartTime] = useState<Date | null>(null);

  // Удалить тренировку
  async function deleteTemplateHandler(templateId: string, templateName: string) {
    const confirmed = confirm(`Удалить тренировку "${templateName}"? Это действие нельзя отменить.`);
    if (!confirmed) return;
    
    try {
      await deleteTemplate(templateId);
      // Обновляем список шаблонов
      const tpl = await getAllTemplates();
      setTemplates(tpl);
    } catch (error) {
      alert("Ошибка при удалении тренировки");
      console.error("Error deleting template:", error);
    }
  }

  // Сохранить шаблон тренировки
  async function handleSaveTemplate() {
    if (!newTemplateName.trim() || newTemplateExercises.length === 0) return;
    setSavingTemplate(true);
    const id = Date.now().toString();
    const data = {
      name: newTemplateName.trim(),
      exercises: newTemplateExercises,
    };
    await saveTemplate(id, data);
    // Обновить список
    const tpl = await getAllTemplates();
    setTemplates(tpl);
    setSavingTemplate(false);
    setNewTemplateName("");
    setNewTemplateExercises([]);
    setShowCreateModal(false);
  }

  // Добавить/убрать упражнение
  function toggleExerciseInTemplate(id: string) {
    setNewTemplateExercises((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Переместить упражнение вверх/вниз
  function moveExercise(idx: number, dir: -1 | 1) {
    setNewTemplateExercises((prev) => {
      const arr = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return arr;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  }

  // Начать редактирование тренировки
  function startEditing() {
    setEditingExercises([...exercises]);
    setIsEditing(true);
  }

  // Отменить редактирование
  function cancelEditing() {
    setIsEditing(false);
    setEditingExercises([]);
    setShowAddExerciseModal(false);
  }

  // Удалить упражнение из редактируемой тренировки
  function removeExerciseFromEdit(idx: number) {
    setEditingExercises(prev => prev.filter((_, i) => i !== idx));
  }

  // Переместить упражнение в редактируемой тренировке
  function moveExerciseInEdit(idx: number, dir: -1 | 1) {
    setEditingExercises(prev => {
      const arr = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return arr;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  }

  // Добавить упражнение в редактируемую тренировку
  function addExerciseToEdit(exerciseId: string) {
    const exercise = allExercises[exerciseId];
    if (exercise) {
      setEditingExercises(prev => [...prev, exercise]);
    }
    setShowAddExerciseModal(false);
  }

  // Сохранить изменения в тренировке
  async function saveTemplateChanges() {
    if (!selectedTemplate || editingExercises.length === 0) return;
    setSavingChanges(true);
    
    // Получаем ID упражнений
    const exerciseIds = editingExercises.map(ex => {
      // Ищем ID упражнения по имени
      const found = Object.entries(allExercises).find(([id, exercise]) => exercise.name === ex.name);
      return found ? found[0] : null;
    }).filter(Boolean);
    
    const updatedData = {
      ...selectedTemplate,
      exercises: exerciseIds,
    };
    
    await saveTemplate(selectedTemplate.id, updatedData);
    
    // Обновляем список шаблонов
    const tpl = await getAllTemplates();
    setTemplates(tpl);
    
    // Обновляем текущие упражнения
    setExercises(editingExercises);
    
    setSavingChanges(false);
    setIsEditing(false);
    setEditingExercises([]);
  }

  // Сохранить результат подхода
  function saveSetResult(exerciseName: string, weight: number, reps: number) {
    const exercise = exercises.find(ex => ex.name === exerciseName);
    if (!exercise) return;

    const currentTargetWeight = exercise.weight || 0;
    const currentTargetReps = exercise.reps || 1;

    // Проверяем, нужно ли обновить цель
    // Условие 1: вес больше целевого
    // Условие 2: вес не меньше целевого И количество повторов больше целевого
    const shouldUpdateTarget = 
      weight > currentTargetWeight || 
      (weight >= currentTargetWeight && reps > currentTargetReps);

    if (shouldUpdateTarget) {
      // Обновляем цель упражнения
      exercise.weight = weight;
      exercise.reps = reps;
      
      // Сохраняем обновленное упражнение в Firestore
      const exerciseId = Object.keys(allExercises).find(id => allExercises[id].name === exerciseName);
      if (exerciseId) {
        saveExercise(exerciseId, exercise);
      }
    }

    // Добавляем результат в массив
    setWorkoutResults(prev => [...prev, {
      exerciseName,
      weight,
      reps,
      timestamp: new Date().toISOString()
    }]);
  }

  // Сохранить полные результаты тренировки
  async function saveWorkoutResults() {
    if (!currentWorkoutStartTime || workoutResults.length === 0) return;

    const workoutData = {
      templateName: selectedTemplate?.name || "Неизвестная тренировка",
      startTime: currentWorkoutStartTime.toISOString(),
      endTime: new Date().toISOString(),
      exercises: exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets,
        targetWeight: ex.weight,
        targetReps: ex.reps,
        results: workoutResults.filter(r => r.exerciseName === ex.name)
      })),
      totalSets: workoutResults.length
    };

    try {
      await addWorkoutResult(workoutData);
      console.log("Результаты тренировки сохранены");
    } catch (error) {
      console.error("Ошибка при сохранении результатов:", error);
    }
  }

  useEffect(() => {
    async function fetchData() {
      await loginAnon();
      const ex = await getAllExercises();
      const tpl = await getAllTemplates();
      setAllExercises(ex);
      setTemplates(tpl);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
      return (
      <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white text-2xl">
        Загрузка...
      </div>
    </>
    );
  }

  // ========== Главный экран ==========
  if (currentScreen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="bg-white/10 backdrop-blur-lg border-b border-white/20 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">💪</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Gymbro</h1>
              <p className="text-purple-200 mt-1">Ваш персональный тренер</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <button
              onClick={() => {
                setCurrentScreen("workout");
                setStep("choose");
              }}
              className="group w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-6 rounded-2xl shadow-2xl flex items-center justify-between transition-all duration-300 transform hover:scale-[1.02] hover:shadow-purple-500/25"
            >
              <div className="text-left">
                <h3 className="text-xl font-bold mb-1">Начать тренировку</h3>
                <p className="text-purple-100 opacity-90">
                  Выберите программу и начните
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ChevronRight
                    size={24}
                    className="transform group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </div>
            </button>

            <button
              onClick={() => setCurrentScreen("exercises")}
              className="group w-full bg-white/10 hover:bg-white/20 backdrop-blur-lg text-white p-6 rounded-2xl border border-white/20 flex items-center justify-between transition-all duration-300 transform hover:scale-[1.02]"
            >
              <div className="text-left">
                <h3 className="text-xl font-bold mb-1">База упражнений</h3>
                <p className="text-gray-300 opacity-90">
                  Редактировать упражнения
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Database
                    size={24}
                    className="transform group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </div>
            </button>
          </div>
         
        </div>
      </div>
    );
  }

  // ========== Экран выбора тренировки ==========
  if (currentScreen === "workout" && step === "choose") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="flex items-center mb-8 pt-4">
          <button
            onClick={() => setCurrentScreen("main")}
            className="mr-4 p-2 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-white">Выберите тренировку</h1>
        </div>
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg transition-all duration-300"
          >
            <Plus size={20} />
            <span>Создать тренировку</span>
          </button>
        </div>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold mb-4 text-slate-900">Новая тренировка</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Название</label>
                  <input
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    value={newTemplateName}
                    onChange={e => setNewTemplateName(e.target.value)}
                    placeholder="Например: Грудь+Трицепс"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Упражнения</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {Object.entries(allExercises).length === 0 && (
                      <div className="p-3 text-gray-400 text-sm">Нет упражнений в базе</div>
                    )}
                    {Object.entries(allExercises).map(([id, ex]: [string, any], idx) => (
                      <div key={id} className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newTemplateExercises.includes(id)}
                            onChange={() => toggleExerciseInTemplate(id)}
                          />
                          <span className="text-gray-800">{ex.name}</span>
                        </div>
                        {newTemplateExercises.includes(id) && (
                          <div className="flex gap-1">
                            <button
                              className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                              disabled={newTemplateExercises.indexOf(id) === 0}
                              onClick={() => moveExercise(newTemplateExercises.indexOf(id), -1)}
                            >↑</button>
                            <button
                              className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                              disabled={newTemplateExercises.indexOf(id) === newTemplateExercises.length - 1}
                              onClick={() => moveExercise(newTemplateExercises.indexOf(id), 1)}
                            >↓</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  className={`w-full mt-2 py-3 rounded-xl font-bold text-lg transition-all ${
                    newTemplateName.trim() && newTemplateExercises.length > 0 && !savingTemplate
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  disabled={!newTemplateName.trim() || newTemplateExercises.length === 0 || savingTemplate}
                  onClick={handleSaveTemplate}
                >
                  {savingTemplate ? "Сохранение..." : "Сохранить тренировку"}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-4">
          {templates.map((tpl: any, i: number) => {
            // Универсальная обработка exercises (массив или строка)
            const exercisesArray = Array.isArray(tpl.exercises)
              ? tpl.exercises
              : typeof tpl.exercises === "string"
                ? tpl.exercises
                    .split(",")
                    .map((s: string) => s.trim().replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, ''))
                    .filter(Boolean)
                : [];
            // Список всех упражнений: [[id, {name, ...}], ...]
            const allExercisesList: [string, any][] = Object.entries(allExercises);
            // Сопоставление: если exercisesArray содержит id — ищем по id, если нет такого id — ищем по name
            const exerciseIds = (exercisesArray as any[]).map((val: any) => {
              if ((allExercises as any)[val]) return val;
              const found = (allExercisesList as any[]).find(([_, ex]) => (ex as any).name === val);
              return found ? found[0] : null;
            }).filter(Boolean) as string[];
            const exerciseObjs = (exerciseIds as any[]).map((id: any) => (allExercises as any)[id]).filter(Boolean);
            const autoDuration = calculateDuration(exerciseObjs);
            return (
              <div
                key={i}
                className="group bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-white group-hover:text-purple-200 transition-colors">
                        {(tpl as any).name || (tpl as any).id || "Без названия"}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTemplateHandler((tpl as any).id, (tpl as any).name || (tpl as any).id || "Без названия");
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors p-1 rounded-lg hover:bg-red-500/10"
                        title="Удалить тренировку"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <div className="text-white/70 text-sm">Время</div>
                      <div className="text-white font-bold text-lg">
                        {autoDuration} мин
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-purple-200 text-sm leading-relaxed mb-4">
                  {exerciseIds.length} упражнений:{" "}
                  {exerciseIds
                    .slice(0, 3)
                    .map((id) => allExercises[id]?.name || id)
                    .join(", ")}
                  {exerciseIds.length > 3 && "..."}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-white/60 text-sm">
                    <span className="mr-2">👥</span>
                    <span>
                      {(exerciseIds as any[]).reduce((total: number, id: any) => total + ((allExercises as any)[id]?.sets || 0), 0)}{" "}
                      подходов всего
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTemplate(tpl);
                      const validExercises = (exerciseIds as any[])
                        .map((id: any) => (allExercises as any)[id])
                        .filter(Boolean)
                        .map((ex: any) => ({ ...ex }));
                      if (validExercises.length === 0) {
                        alert("В шаблоне нет ни одного валидного упражнения!");
                        return;
                      }
                      setExercises(validExercises);
                      setStep("preview");
                    }}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 rounded-xl font-medium transition-all"
                  >
                    Выбрать
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }


  // Превью экрана тренировки перед стартом
  if (currentScreen === "workout" && step === "preview" && selectedTemplate) {
    // Получаем массив упражнений для превью
    const exerciseObjs = isEditing ? editingExercises : exercises.filter(Boolean);
    const autoDuration = calculateDuration(exerciseObjs);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="flex items-center mb-8 pt-4">
          <button
            onClick={isEditing ? cancelEditing : () => setStep("choose")}
            className="mr-4 p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-white">
            Тренировка: {selectedTemplate.name || selectedTemplate.id || "Без названия"}
          </h1>
          {!isEditing && (
            <button
              onClick={startEditing}
              className="ml-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-all"
            >
              <Edit3 size={20} />
            </button>
          )}
        </div>
        <div className="mb-4 text-white/70 text-sm">
          Длительность: {autoDuration} мин
        </div>
        {isEditing && (
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setShowAddExerciseModal(true)}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2"
            >
              <Plus size={16} />
              Добавить упражнение
            </button>
            <button
              onClick={saveTemplateChanges}
              disabled={savingChanges || editingExercises.length === 0}
              className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                savingChanges || editingExercises.length === 0
                  ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
              }`}
            >
              <Save size={16} />
              {savingChanges ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        )}
        <div className="space-y-4 mb-8">
          {exerciseObjs.map((ex: any, i: number) => (
            <div
              key={i}
              className={`flex items-center gap-4 bg-white/10 rounded-xl p-4 border border-white/20 ${
                isEditing ? "relative" : ""
              }`}
            >
              {isEditing && (
                <div className="flex flex-col gap-1 mr-2 items-center">
                  <button
                    className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                    disabled={i === 0}
                    onClick={() => moveExerciseInEdit(i, -1)}
                  >↑</button>
                  <button
                    className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                    disabled={i === exerciseObjs.length - 1}
                    onClick={() => moveExerciseInEdit(i, 1)}
                  >↓</button>
                </div>
              )}
              <img
                src={ex.image}
                alt=""
                className="w-16 h-16 object-cover rounded-xl border-2 border-white/30 flex-shrink-0"
                onError={getFallbackImage}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-bold text-lg text-white">{ex.name}</div>
                  {isEditing && (
                    <button
                      onClick={() => removeExerciseFromEdit(i)}
                      className="text-red-400 hover:text-red-300 transition-colors p-1 rounded-lg hover:bg-red-500/10"
                      title="Удалить упражнение"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="text-purple-200 text-sm">
                  {ex.sets}×{ex.reps} {ex.weight ? `• ${ex.weight}кг` : null} •{" "}
                  {ex.rest} сек отдых
                </div>
              </div>
            </div>
          ))}
        </div>
        {showAddExerciseModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold mb-4 text-slate-900">Добавить упражнение</h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {Object.entries(allExercises).map(([id, ex]: [string, any]) => (
                  <button
                    key={id}
                    onClick={() => addExerciseToEdit(id)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{ex.name}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAddExerciseModal(false)}
                className="mt-4 w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
        <button
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xl px-6 py-5 rounded-2xl font-bold shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
          onClick={() => {
            if (exerciseObjs.length === 0) {
              alert("Нет ни одного упражнения для тренировки!");
              return;
            }
            setStep("workout");
            setExerciseIdx(0);
            setSetIdx(0);
            setActualWeight(exerciseObjs[0]?.weight || 0);
            setActualReps(exerciseObjs[0]?.reps || 1);
            setCurrentWorkoutStartTime(new Date());
          }}
        >
          <span>🚀 Начать тренировку</span>
        </button>
      </div>
    );
  }


  // ========== Экран самой тренировки ==========
  if (currentScreen === "workout" && step === "workout") {
    const exercise = exercises[exerciseIdx] as any || {};
    const totalSets = exercise.sets || 1;

    function handleDone() {
      // Сохраняем результат подхода
      if (exercise && exercise.name) {
        saveSetResult(exercise.name, actualWeight, actualReps);
      }
      
      if (setIdx + 1 < totalSets) {
        setSetIdx(setIdx + 1);
      } else if (exerciseIdx + 1 < exercises.length) {
        setExerciseIdx(exerciseIdx + 1);
        setSetIdx(0);
        setActualWeight(exercises[exerciseIdx + 1]?.weight);
        setActualReps(exercises[exerciseIdx + 1]?.reps);
      } else {
        // Тренировка завершена - сохраняем все результаты
        if (workoutResults.length > 0) {
          saveWorkoutResults();
        }
        setStep("done");
      }
      setResting(true);
      setRestPaused(false);
    }
    function finishRest() {
      setResting(false);
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
        <div className="w-full p-6 pt-8">
          <div className="flex items-center gap-2 mb-4">
            {exercises.map((_, idx) => (
              <div
                key={idx}
                className={`flex-1 h-3 rounded-full transition-all duration-500 ${
                  idx < exerciseIdx
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-emerald-500/50 shadow-lg"
                    : idx === exerciseIdx
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 shadow-purple-500/50 shadow-lg"
                    : "bg-white/20 backdrop-blur-sm"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between items-center">
            <button
              className="text-white/80 bg-white/10 backdrop-blur-lg border border-white/20 px-4 py-2 rounded-xl text-sm hover:bg-white/20 transition-all"
              onClick={() => setCurrentScreen("main")}
            >
              ← Выйти
            </button>
            <span className="text-white/70 text-sm bg-white/10 backdrop-blur-lg px-3 py-1 rounded-full border border-white/20">
              {exerciseIdx + 1} из {exercises.length}
            </span>
            <button
              onClick={() => {
                // Сохраняем результаты при досрочном завершении
                if (workoutResults.length > 0) {
                  saveWorkoutResults();
                }
                setStep("done");
              }}
              className="text-orange-300 bg-orange-500/20 backdrop-blur-lg border border-orange-400/30 px-4 py-2 rounded-xl text-sm hover:bg-orange-500/30 transition-all"
            >
              Завершить ✓
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center w-full relative flex-1 px-4 pb-8 max-w-md mx-auto">
          {resting ? (
            <RestTimer
              seconds={exercise.rest}
              onFinish={finishRest}
              onSkip={finishRest}
              isPaused={restPaused}
              onTogglePause={() => setRestPaused(!restPaused)}
            />
          ) : (
            <>
              <div className="w-full flex flex-col items-center mb-6 text-center">
                <h2 className="text-3xl font-bold text-white leading-tight mb-3 px-4">
                  {exercise.name}
                </h2>
                <div className="flex justify-center w-full">
                  <span className="text-lg text-purple-200 bg-white/10 backdrop-blur-lg px-4 py-2 rounded-full border border-white/20">
                    Подход {setIdx + 1} из {totalSets}
                  </span>
                </div>
              </div>

              <div className="relative w-full flex justify-center items-center mb-8">
                <div className="relative">
                  <img
                    src={exercise.image}
                    alt={`Упражнение: ${exercise.name}`}
                    className="rounded-3xl shadow-2xl w-full max-w-sm h-64 object-cover border-2 border-white/30 backdrop-blur-sm"
                    onError={getFallbackImage}
                  />
                  <div className="absolute left-0 top-0 bg-transparent backdrop-blur-lg rounded-2xl px-4 py-3 shadow-2xl">
                    <div className="text-center">
                      <span className="text-purple-700 text-xs font-bold block uppercase tracking-wide">
                        Цель
                      </span>
                      <span className="text-gray-900 text-xl font-extrabold block mt-1">
                        {exercise.weight || "—"} кг
                      </span>
                      <span className="text-gray-700 text-sm block">
                        {exercise.reps} повторов
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-row justify-center items-center gap-8 mb-8">
                <div className="flex flex-col items-center">
                  <span className="text-white/70 text-sm mb-3 font-medium">
                    Вес, кг
                  </span>
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-2 border border-white/20">
                    <NumberSelect
                      value={actualWeight}
                      setValue={setActualWeight}
                      min={0}
                      max={200}
                      step={2.5}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-white/70 text-sm mb-3 font-medium">
                    Повторения
                  </span>
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-2 border border-white/20">
                    <NumberSelect
                      value={actualReps}
                      setValue={setActualReps}
                      min={1}
                      max={30}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              <button
                className="w-4/5 h-16 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xl font-bold shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300 transform hover:scale-[1.05] active:scale-[0.98]"
                onClick={handleDone}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>✅</span>
                  <span>Подход выполнен</span>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ========== Экран завершения ==========
  if (step === "done") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/25">
            <span className="text-5xl">🎉</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 text-white">
            Тренировка завершена!
          </h1>
          <p className="text-lg text-purple-200">
            Отличная работа! Все результаты сохранены
          </p>
          {workoutResults.length > 0 && (
            <div className="mt-4 text-sm text-white/70">
              Выполнено подходов: {workoutResults.length}
            </div>
          )}
        </div>
        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => {
              setCurrentScreen("main");
              setStep("choose");
              setExerciseIdx(0);
              setSetIdx(0);
              setWorkoutResults([]);
              setCurrentWorkoutStartTime(null);
            }}
            className="w-full bg-white/10 backdrop-blur-lg hover:bg-white/20 text-white text-lg px-6 py-4 rounded-2xl font-medium border border-white/20 transition-all duration-300 transform hover:scale-[1.02]"
          >
            <div className="flex items-center justify-center space-x-2">
              <span>🏠</span>
              <span>На главный экран</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ========== <База упражнений> ==========
  if (currentScreen === "exercises") {
    // Получаем список всех упражнений и уникальные категории
    const exerciseList = Object.values(allExercises) as any[];
    const exerciseIds = Object.keys(allExercises);
    const categories = Array.from(
      new Set(exerciseList.map((ex: any) => ex.category))
    ).sort();

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="flex items-center mb-8 pt-4">
          <button
            onClick={() => setCurrentScreen("main")}
            className="mr-4 p-2 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-white">База упражнений</h1>
        </div>

        <div className="space-y-10">
          {categories.map((category) => (
            <div key={category}>
              <h2 className="text-2xl font-bold text-purple-200 mb-4 mt-8">
                {category}
              </h2>
              <div className="space-y-4">
                {exerciseList
                  .filter((ex: any) => ex.category === category)
                  .map((exercise: any, i: number) => (
                    <div
                      key={exercise.name || i}
                      className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 flex gap-4 items-center"
                    >
                      <img
                        src={exercise.image}
                        alt={exercise.name}
                        className="w-16 h-16 object-cover rounded-xl border-2 border-white/30"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            "https://cdn-icons-png.flaticon.com/512/147/147144.png";
                        }}
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-white mb-2">
                          {exercise.name}
                        </h4>
                        <div className="flex gap-4 flex-wrap">
                          <div>
                            <label className="text-white/70 text-xs">
                              Подходы
                            </label>
                            <input
                              type="number"
                              value={exercise.sets}
                              min="1"
                              max="10"
                              onChange={(e) => {
                                exercise.sets = +e.target.value;
                                setExercises([...exerciseList]);
                              }}
                              className="ml-2 w-16 bg-white/20 text-white rounded px-2 py-1 border border-white/30"
                            />
                          </div>
                          <div>
                            <label className="text-white/70 text-xs">
                              Повторы
                            </label>
                            <input
                              type="number"
                              value={exercise.reps}
                              min="1"
                              max="50"
                              onChange={(e) => {
                                exercise.reps = +e.target.value;
                                setExercises([...exerciseList]);
                              }}
                              className="ml-2 w-16 bg-white/20 text-white rounded px-2 py-1 border border-white/30"
                            />
                          </div>
                          <div>
                            <label className="text-white/70 text-xs">
                              Вес, кг
                            </label>
                            <input
                              type="number"
                              value={exercise.weight}
                              min="0"
                              step="2.5"
                              onChange={(e) => {
                                exercise.weight = +e.target.value;
                                setExercises([...exerciseList]);
                              }}
                              className="ml-2 w-20 bg-white/20 text-white rounded px-2 py-1 border border-white/30"
                            />
                          </div>
                          <div>
                            <label className="text-white/70 text-xs">
                              Отдых, сек
                            </label>
                            <input
                              type="number"
                              value={exercise.rest}
                              min="30"
                              max="600"
                              step="30"
                              onChange={(e) => {
                                exercise.rest = +e.target.value;
                                setExercises([...exerciseList]);
                              }}
                              className="ml-2 w-20 bg-white/20 text-white rounded px-2 py-1 border border-white/30"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-10">
          <button
            onClick={async () => {
              for (let i = 0; i < exerciseList.length; i++) {
                const id = exerciseIds[i];
                const data = exerciseList[i];
                await saveExercise(id, data);
              }
              alert("Изменения сохранены!");
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all duration-300"
          >
            Сохранить все
          </button>
        </div>
      </div>
    );
  }

  return null;
}
