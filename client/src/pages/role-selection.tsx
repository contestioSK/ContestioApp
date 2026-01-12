import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Fish, Scale, Settings, ChevronRight } from "lucide-react";
import { useUserMode, type UserMode } from "@/contexts/UserModeContext";
import { useAuth } from "@/hooks/useAuth";

export default function RoleSelectionScreen() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const {
    availableRoles,
    refereeCompetitions,
    organizerCompetitions,
    setActiveMode,
    isLoading: contextLoading,
    needsRoleSelection,
  } = useUserMode();

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  useEffect(() => {
    if (!contextLoading && !needsRoleSelection && availableRoles.length === 1) {
      setActiveMode('user');
      setLocation("/diary");
    }
  }, [contextLoading, needsRoleSelection, availableRoles, setActiveMode, setLocation]);

  const handleSelectMode = (mode: UserMode, competitionId?: string) => {
    setActiveMode(mode, competitionId);
    
    switch (mode) {
      case 'user':
        setLocation("/diary");
        break;
      case 'referee':
        setLocation("/referee-interface");
        break;
      case 'organizer':
        if (competitionId) {
          setLocation(`/organizer/competition/${competitionId}`);
        } else {
          setLocation("/organizer");
        }
        break;
    }
  };

  if (authLoading || contextLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white text-lg"
        >
          Načítavam...
        </motion.div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-4xl w-full"
      >
        <motion.div variants={cardVariants} className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Vitaj späť!
          </h1>
          <p className="text-slate-400 text-lg">
            Vyber si, ako chceš pokračovať
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableRoles.includes('user') && (
            <motion.div variants={cardVariants}>
              <RoleCard
                icon={<Fish className="w-10 h-10" />}
                title="Pokračovať do Denníka"
                description="Tvoje úlovky a osobné štatistiky"
                ctaText="Vstúpiť"
                colorScheme="teal"
                onClick={() => handleSelectMode('user')}
              />
            </motion.div>
          )}

          {availableRoles.includes('referee') && (
            <motion.div variants={cardVariants}>
              {refereeCompetitions.length === 1 ? (
                <RoleCard
                  icon={<Scale className="w-10 h-10" />}
                  title="Bodovať preteky"
                  description={refereeCompetitions[0].name}
                  ctaText="Spustiť váženie"
                  colorScheme="orange"
                  onClick={() => handleSelectMode('referee', refereeCompetitions[0].id)}
                />
              ) : (
                <RoleCard
                  icon={<Scale className="w-10 h-10" />}
                  title="Bodovať preteky"
                  description={`${refereeCompetitions.length} aktívnych súťaží`}
                  ctaText="Vybrať súťaž"
                  colorScheme="orange"
                  competitions={refereeCompetitions}
                  onSelectCompetition={(id) => handleSelectMode('referee', id)}
                />
              )}
            </motion.div>
          )}

          {availableRoles.includes('organizer') && (
            <motion.div variants={cardVariants}>
              {organizerCompetitions.active.length === 1 ? (
                <RoleCard
                  icon={<Settings className="w-10 h-10" />}
                  title="Spravovať súťaž"
                  description={organizerCompetitions.active[0].name}
                  ctaText="Otvoriť správu"
                  colorScheme="purple"
                  onClick={() => handleSelectMode('organizer', organizerCompetitions.active[0].id)}
                />
              ) : organizerCompetitions.active.length > 1 ? (
                <RoleCard
                  icon={<Settings className="w-10 h-10" />}
                  title="Spravovať súťaž"
                  description={`${organizerCompetitions.active.length} aktívnych súťaží`}
                  ctaText="Vybrať súťaž"
                  colorScheme="purple"
                  competitions={organizerCompetitions.active}
                  onSelectCompetition={(id) => handleSelectMode('organizer', id)}
                />
              ) : (
                <RoleCard
                  icon={<Settings className="w-10 h-10" />}
                  title="Organizátor"
                  description="Žiadne aktívne súťaže"
                  ctaText="Zobraziť súťaže"
                  colorScheme="purple"
                  onClick={() => handleSelectMode('organizer')}
                  disabled={false}
                />
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaText: string;
  colorScheme: 'teal' | 'orange' | 'purple';
  onClick?: () => void;
  disabled?: boolean;
  competitions?: Array<{ id: string; name: string }>;
  onSelectCompetition?: (id: string) => void;
}

function RoleCard({
  icon,
  title,
  description,
  ctaText,
  colorScheme,
  onClick,
  disabled = false,
  competitions,
  onSelectCompetition,
}: RoleCardProps) {
  const colorClasses = {
    teal: {
      bg: 'from-teal-500/20 to-cyan-500/20',
      border: 'border-teal-500/30',
      icon: 'text-teal-400',
      button: 'bg-teal-500 hover:bg-teal-600',
      glow: 'hover:shadow-teal-500/20',
    },
    orange: {
      bg: 'from-orange-500/20 to-amber-500/20',
      border: 'border-orange-500/30',
      icon: 'text-orange-400',
      button: 'bg-orange-500 hover:bg-orange-600',
      glow: 'hover:shadow-orange-500/20',
    },
    purple: {
      bg: 'from-purple-500/20 to-indigo-500/20',
      border: 'border-purple-500/30',
      icon: 'text-purple-400',
      button: 'bg-purple-500 hover:bg-purple-600',
      glow: 'hover:shadow-purple-500/20',
    },
  };

  const colors = colorClasses[colorScheme];

  if (competitions && competitions.length > 0) {
    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        className={`
          relative p-6 rounded-2xl
          bg-gradient-to-br ${colors.bg}
          backdrop-blur-xl
          border ${colors.border}
          shadow-xl ${colors.glow}
          transition-shadow duration-300
        `}
      >
        <div className={`${colors.icon} mb-4`}>{icon}</div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 mb-4">{description}</p>
        
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {competitions.map((comp) => (
            <button
              key={comp.id}
              onClick={() => onSelectCompetition?.(comp.id)}
              className={`
                w-full flex items-center justify-between
                px-3 py-2 rounded-lg
                bg-white/5 hover:bg-white/10
                text-white text-sm
                transition-colors
              `}
            >
              <span className="truncate">{comp.name}</span>
              <ChevronRight className="w-4 h-4 flex-shrink-0 ml-2" />
            </button>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -4 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-full p-6 rounded-2xl text-left
        bg-gradient-to-br ${colors.bg}
        backdrop-blur-xl
        border ${colors.border}
        shadow-xl ${colors.glow}
        transition-shadow duration-300
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className={`${colors.icon} mb-4`}>{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 mb-6">{description}</p>
      
      <div
        className={`
          inline-flex items-center gap-2
          px-4 py-2 rounded-lg
          ${colors.button}
          text-white font-medium
          transition-colors
        `}
      >
        {ctaText}
        <ChevronRight className="w-4 h-4" />
      </div>
    </motion.button>
  );
}
