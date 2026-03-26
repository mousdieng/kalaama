#!/usr/bin/env node
/**
 * Bulk import vocabulary data to Supabase
 * Usage: node scripts/import-vocabulary.cjs
 */

const fs = require('fs');
const path = require('path');

// Import environment config
const envPath = path.join(__dirname, '../src/environments/environment.ts');
let envContent = fs.readFileSync(envPath, 'utf8');

const extractValue = (name) => {
  const regex = new RegExp(`${name}:\\s*['"]([^'"]*)['"']`, 'm');
  const match = envContent.match(regex);
  return match ? match[1] : '';
};

const supabaseUrl = extractValue('supabaseUrl');
const supabaseKey = extractValue('supabaseAnonKey');

// Dynamically import Supabase
const createSupabaseClient = async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseKey);
};

// Vocabulary data to import
const vocabularyData = [
    {
        "aiExamples": [
            "Der Empfänger hat das Paket angenommen. - Le destinataire a accepté le colis.",
            "Sind Sie der beabsichtigte Empfänger dieser E-Mail? - Êtes-vous le destinataire prévu de cet e-mail ?",
            "Bitte tragen Sie den vollständigen Namen des Empfängers ein. - Veuillez inscrire le nom complet du destinataire.",
            "Der alte Radio-Empfänger hat einen schlechten Empfang. - L'ancien récepteur radio a une mauvaise réception.",
            "Wer war der glückliche Empfänger dieses Geschenks? - Qui était l'heureux destinataire de ce cadeau ?",
            "Die Bank benötigt die IBAN des Empfängers für die Überweisung. - La banque a besoin de l'IBAN du bénéficiaire pour le virement.",
            "Ein moderner Satelliten-Empfänger bietet viele Kanäle. - Un récepteur satellite moderne offre de nombreuses chaînes.",
            "Als Empfänger von Nachrichten sollte man die Quellen kritisch prüfen. - En tant que récepteur de nouvelles, il faut vérifier les sources de manière critique.",
            "Da der Empfänger nicht ermittelt werden konnte, ging die Sendung zurück an den Absender. - Comme le destinataire n'a pas pu être identifié, l'envoi est retourné à l'expéditeur.",
            "Ist der GPS-Empfänger in Ihrem Smartphone eingeschaltet? - Le récepteur GPS de votre smartphone est-il activé ?",
            "Die Liste aller Empfänger der Einladung wird morgen verschickt. - La liste de tous les destinataires de l'invitation sera envoyée demain.",
            "Falls der Empfänger nicht persönlich anwesend ist, kann das Paket auch einem Nachbarn übergeben werden. - Si le destinataire n'est pas personnellement présent, le colis peut aussi être remis à un voisin.",
            "Er war der ungewollte Empfänger ihrer harschesten Kritik nach dem Misserfolg. - Il était le destinataire involontaire de sa critique la plus acerbe après l'échec.",
            "Der Empfänger ist verpflichtet, den Erhalt der Ware zu bestätigen. - Le destinataire est tenu de confirmer la réception de la marchandise.",
            "An den Empfänger dieser wichtigen Mitteilung. - Au destinataire de cette communication importante."
        ],
        "context_sentence": "– Ihnen auch! Danke.",
        "created_at": "2026-03-23T16:06:29.164Z",
        "definition": "",
        "examples": [],
        "id": "word_1774281989164_fth8g2d7d",
        "language": "de",
        "mastery_level": 0,
        "part_of_speech": "",
        "pronunciation": "",
        "review_count": 0,
        "translation": "Récepteur",
        "updated_at": "2026-03-23T16:06:29.170Z",
        "video_id": "Lg5P2w_Ro1c",
        "video_title": "Deutsch lernen (A2): Ganzer Film auf Deutsch - \"Nicos Weg\" | Deutsch lernen mit Videos | Untertitel",
        "word": "Empfänger"
    },
    {
        "aiExamples": [
            "Er ist vor zwei Stunden gegangen, und mittlerweile ist er sicher zu Hause. - Il est parti il y a deux heures, et maintenant il est sûrement chez lui.",
            "Am Anfang waren es nur wenige, aber mittlerweile haben sich viele Leute angemeldet. - Au début, ils n'étaient que quelques-uns, mais maintenant beaucoup de gens se sont inscrits.",
            "Das Projekt war schwierig, aber mittlerweile sind wir fast fertig. - Le projet était difficile, mais à présent nous avons presque terminé.",
            "Früher las ich oft Bücher, doch mittlerweile höre ich lieber Podcasts. - Avant, je lisais souvent des livres, mais maintenant je préfère écouter des podcasts.",
            "Seit unserem letzten Treffen sind zwei Jahre vergangen, und mittlerweile hat sie zwei Kinder. - Deux ans se sont écoulés depuis notre dernière rencontre, et entre-temps elle a eu deux enfants.",
            "Ich dachte, es wäre noch früh, aber mittlerweile ist es schon Mitternacht. - Je pensais qu'il était encore tôt, mais il est déjà minuit à présent.",
            "Das Restaurant war früher leer, doch mittlerweile muss man immer reservieren. - Le restaurant était vide avant, mais maintenant il faut toujours réserver.",
            "Die meisten Leute nutzen mittlerweile Smartphones für fast alles. - La plupart des gens utilisent désormais des smartphones pour presque tout.",
            "Er hat viel gelernt und ist mittlerweile ein Experte auf diesem Gebiet. - Il a beaucoup appris et est désormais un expert dans ce domaine.",
            "Die Preise sind in den letzten Monaten stark gestiegen, und mittlerweile können sich viele das nicht mehr leisten. - Les prix ont fortement augmenté ces derniers mois, et à présent beaucoup ne peuvent plus se le permettre.",
            "Nach langer Krankheit geht es ihr mittlerweile wieder viel besser. - Après une longue maladie, elle va beaucoup mieux à présent.",
            "Es ist mittlerweile allgemein bekannt, dass Sport gesund ist. - Il est désormais de notoriété publique que le sport est sain.",
            "Nach der Fusion ist das Unternehmen mittlerweile der größte Anbieter auf dem Markt. - Après la fusion, l'entreprise est désormais le plus grand fournisseur sur le marché.",
            "Obwohl der Start holprig war, hat sich das Team mittlerweile gut eingespielt. - Bien que le démarrage ait été difficile, l'équipe est maintenant bien rodée.",
            "Als ich vor fünf Jahren anfing, hätte ich nie gedacht, dass ich mittlerweile so weit kommen würde. - Quand j'ai commencé il y a cinq ans, je n'aurais jamais pensé que j'arriverais aussi loin maintenant."
        ],
        "context_sentence": "– Die Antwort kannst du mittlerweile im Schlaf.",
        "created_at": "2026-03-23T16:02:12.268Z",
        "definition": "Indique qu'une situation a évolué ou qu'un certain temps s'est écoulé, signifiant 'à présent', 'maintenant', 'désormais' ou 'entre-temps'.",
        "examples": [
            "Früher war es ein Geheimnis, aber mittlerweile wissen es alle. - Avant c'était un secret, mais maintenant tout le monde le sait.",
            "Ich warte schon eine Stunde, und mittlerweile bin ich sehr müde. - J'attends depuis une heure, et à présent je suis très fatigué(e).",
            "Sie hat vor einem Jahr angefangen, und mittlerweile spricht sie fließend Deutsch. - Elle a commencé il y a un an, et désormais elle parle couramment allemand."
        ],
        "id": "word_1774281732268_7olq5nwpn",
        "language": "de",
        "mastery_level": 0,
        "part_of_speech": "adverb",
        "pronunciation": "/mɪtlɐˈvaɪlə/",
        "review_count": 0,
        "translation": "maintenant / désormais / à présent",
        "updated_at": "2026-03-23T16:02:12.275Z",
        "video_id": "Lg5P2w_Ro1c",
        "video_title": "Deutsch lernen (A2): Ganzer Film auf Deutsch - \"Nicos Weg\" | Deutsch lernen mit Videos | Untertitel",
        "word": "mittlerweile"
    },
    {
        "aiExamples": [
            "Wie nennst du dein neues Haustier? - Comment appelles-tu ton nouvel animal de compagnie ?",
            "Warum nennst du ihn immer 'Chef'? - Pourquoi l'appelles-tu toujours 'chef' ?",
            "Welche Gründe nennst du für deine Entscheidung? - Quelles raisons cites-tu pour ta décision ?",
            "Was nennst du einen echten Erfolg in diesem Bereich? - Qu'appelles-tu un vrai succès dans ce domaine ?",
            "Nennst du mir bitte deinen vollständigen Namen? - Peux-tu me donner ton nom complet, s'il te plaît ?",
            "Nennst du diese Situation noch akzeptabel? - Appelles-tu toujours cette situation acceptable ?",
            "Welche drei Eigenschaften nennst du als deine größten Stärken? - Quelles trois qualités cites-tu comme tes plus grandes forces ?",
            "Wenn du einen Wunsch nennst, was wäre es? - Si tu exprimes un souhait, quel serait-il ?",
            "Wie nennst du dieses Werkzeug auf Deutsch? - Comment appelles-tu cet outil en allemand ?",
            "Nennst du das etwa fairen Wettbewerb? - Appelles-tu ça de la concurrence loyale, par hasard ?",
            "Es ist wichtig, dass du die Quellen genau nennst. - Il est important que tu cites les sources avec précision.",
            "Nennst du mir die genauen Daten der Veranstaltung per E-Mail? - Me donnerais-tu les dates exactes de l'événement par e-mail ?",
            "Nennst du dich selbst einen optimistischen Menschen? - Te considères-tu comme une personne optimiste ?",
            "Was genau nennst du 'Innovation' in deinem Projekt? - Qu'appelles-tu exactement 'innovation' dans ton projet ?",
            "Nur wenn du die Probleme offen nennst, können wir eine Lösung finden. - Seulement si tu exposes ouvertement les problèmes, nous pourrons trouver une solution."
        ],
        "context_sentence": "Guten Tag, ich heiße Nico González und ich möchte bitte ein Konto eröffnen.",
        "created_at": "2026-03-23T16:00:05.272Z",
        "definition": "Forme conjuguée du verbe allemand 'nennen' (nommer, appeler, citer) à la deuxième personne du singulier du présent de l'indicatif.",
        "examples": [
            "Wie nennst du dieses Tier? - Comment appelles-tu cet animal ?",
            "Du nennst mich immer beim falschen Namen. - Tu m'appelles toujours par le mauvais nom.",
            "Was nennst du einen Erfolg? - Qu'est-ce que tu appelles un succès ?"
        ],
        "id": "word_1774281605272_wpl32v23i",
        "language": "de",
        "mastery_level": 0,
        "part_of_speech": "verbe",
        "pronunciation": "/nɛnst/",
        "review_count": 0,
        "translation": "tu nommes, tu appelles",
        "updated_at": "2026-03-23T16:00:05.278Z",
        "video_id": "Lg5P2w_Ro1c",
        "video_title": "Deutsch lernen (A2): Ganzer Film auf Deutsch - \"Nicos Weg\" | Deutsch lernen mit Videos | Untertitel",
        "word": "nennst"
    },
    {
        "aiExamples": [
            "Ab nächster Woche bin ich im Urlaub. - À partir de la semaine prochaine, je serai en vacances.",
            "Diese Regelung gilt ab sofort. - Ce règlement est valable immédiatement.",
            "Der Flug geht ab Frankfurt. - Le vol part de Francfort.",
            "Preise starten ab 99 Euro. - Les prix commencent à partir de 99 euros.",
            "Er hat seinen Mantel abgelegt. - Il a enlevé son manteau.",
            "Ein Ast ist vom Baum abgebrochen. - Une branche s'est cassée de l'arbre.",
            "Ab ins Bett mit dir! - Au lit !",
            "Das Geschäft ist ab 10 Uhr geöffnet. - Le magasin est ouvert à partir de 10 heures.",
            "Ab hier wird der Weg steiler. - À partir d'ici, le chemin devient plus raide.",
            "Sie hat das Etikett vorsichtig abgezogen. - Elle a retiré l'étiquette avec précaution.",
            "Ab einer Temperatur von 25 Grad wird es heiß. - À partir d'une température de 25 degrés, il fait chaud.",
            "Die Lieferung ab Werk ist günstiger. - La livraison départ usine est moins chère.",
            "Die Farbe blättert langsam ab. - La peinture s'écaille lentement.",
            "Das Essen ist schon ab, wirf es weg! - La nourriture est déjà avariée, jette-la !",
            "Bitte ziehen Sie den Rabatt vom Gesamtpreis ab. - Veuillez déduire la réduction du prix total."
        ],
        "context_sentence": "– Du sprichst kein Spanisch mehr. Ab jetzt sprichst du nur noch Deutsch.",
        "created_at": "2026-03-23T15:51:02.995Z",
        "definition": "Indique un point de départ temporel ou spatial; à partir de, dès.",
        "examples": [
            "Ab morgen bin ich im Urlaub. - À partir de demain, je serai en vacances.",
            "Ab hier ist der Weg gesperrt. - À partir d'ici, le chemin est bloqué.",
            "Ab sofort gelten neue Regeln. - Dès maintenant, de nouvelles règles s'appliquent."
        ],
        "id": "word_1774281062995_0enk5773u",
        "language": "de",
        "mastery_level": 0,
        "part_of_speech": "préposition",
        "pronunciation": "/ap/",
        "review_count": 0,
        "translation": "à partir de, dès",
        "updated_at": "2026-03-23T15:51:03.002Z",
        "video_id": "Lg5P2w_Ro1c",
        "video_title": "Deutsch lernen (A2): Ganzer Film auf Deutsch - \"Nicos Weg\" | Deutsch lernen mit Videos | Untertitel",
        "word": "Ab"
    },
    {
        "aiExamples": [
            "Du kümmerst dich wirklich gut um deine kleine Schwester. - Tu t'occupes vraiment bien de ta petite sœur.",
            "Kümmerst du dich bitte um die Reservierung für heute Abend? - Peux-tu t'occuper de la réservation pour ce soir, s'il te plaît ?",
            "Warum kümmerst du dich immer so sehr um die Meinung anderer? - Pourquoi te soucies-tu toujours autant de l'opinion des autres ?",
            "Ich hoffe, du kümmerst dich auch mal um dich selbst und nicht nur um andere. - J'espère que tu t'occupes aussi de toi-même et pas seulement des autres.",
            "Siehst du, wie gut die Pflanze wächst, seit du dich darum kümmerst? - Vois-tu comme la plante pousse bien depuis que tu t'en occupes ?",
            "Kümmerst du dich selbst um die Wartung des Geräts oder lässt du das machen? - T'occupes-tu toi-même de l'entretien de l'appareil ou le fais-tu faire ?",
            "Wenn du dich nicht um das Projekt kümmerst, wird es nie fertig werden. - Si tu ne t'occupes pas du projet, il ne sera jamais terminé.",
            "Morgen kümmerst du dich dann bitte um die Einkäufe, ja? - Demain, tu t'occuperas des courses, d'accord ?",
            "Es ist wichtig, dass du dich um deine Prioritäten kümmerst, bevor du dich verzettelst. - Il est important que tu t'occupes de tes priorités avant de t'éparpiller.",
            "Kümmerst du dich wirklich um solche Kleinigkeiten, wenn es größere Probleme gibt? - T'occupes-tu vraiment de telles broutilles quand il y a de plus gros problèmes ?",
            "Du kümmerst dich so liebevoll um unser Zuhause, das merkt man. - Tu t'occupes de notre maison avec tant d'amour, cela se voit.",
            "Ich habe gehört, du bist krank. Kümmerst du dich gut um deine Gesundheit? - J'ai entendu dire que tu étais malade. Prends-tu bien soin de ta santé ?",
            "Bitte stell sicher, dass du dich um alle dringenden E-Mails kümmerst, bevor du gehst. - Assure-toi de t'occuper de tous les e-mails urgents avant de partir.",
            "Warum kümmerst du dich so sehr darum, was andere über deinen Lebensstil denken? - Pourquoi te soucies-tu autant de ce que les autres pensent de ton mode de vie ?",
            "Es ist erstaunlich, wie gründlich du dich um die Vorbereitung der Prüfung kümmerst. - Il est étonnant de voir avec quelle minutie tu t'occupes de la préparation de l'examen."
        ],
        "context_sentence": "– Okay. Aber du kümmerst dich um alles:",
        "created_at": "2026-03-23T15:47:49.613Z",
        "definition": "Forme conjuguée du verbe 'sich kümmern um' (s'occuper de, prendre soin de, veiller sur), à la deuxième personne du singulier du présent de l'indicatif.",
        "examples": [
            "Du kümmerst dich immer so gut um deine Katze. - Tu t'occupes toujours si bien de ton chat.",
            "Ich hoffe, du kümmerst dich auch um die Formalitäten. - J'espère que tu t'occuperas aussi des formalités.",
            "Wenn du dich nicht darum kümmerst, wer dann? - Si tu ne t'en occupes pas, qui le fera alors ?"
        ],
        "id": "word_1774280869613_995gahosc",
        "language": "de",
        "mastery_level": 0,
        "part_of_speech": "verb",
        "pronunciation": "/ˈkʏmɐst/",
        "review_count": 0,
        "translation": "tu t'occupes",
        "updated_at": "2026-03-23T15:47:49.618Z",
        "video_id": "Lg5P2w_Ro1c",
        "video_title": "Deutsch lernen (A2): Ganzer Film auf Deutsch - \"Nicos Weg\" | Deutsch lernen mit Videos | Untertitel",
        "word": "kümmerst"
    },
    {
        "aiExamples": [
            "Er ist vor einer Stunde weggegangen. - Il est parti il y a une heure.",
            "Sie ist vom Treffen weggegangen, bevor es zu Ende war. - Elle est partie de la réunion avant qu'elle ne soit terminée.",
            "Viele Gäste sind weggegangen, weil die Musik zu laut war. - Beaucoup d'invités sont partis parce que la musique était trop forte.",
            "Er ist stillschweigend weggegangen, ohne sich zu verabschieden. - Il est parti silencieusement, sans dire au revoir.",
            "Warum seid ihr so plötzlich weggegangen? - Pourquoi êtes-vous partis si soudainement ?",
            "Nachdem er weggegangen war, fühlte sie sich sehr einsam. - Après qu'il fut parti, elle se sentit très seule.",
            "Die Kinder sind vom Spielplatz weggegangen, als es dunkel wurde. - Les enfants sont partis de l'aire de jeux quand il a fait nuit.",
            "Die Katze ist vom Sofa weggegangen, als ich sie rufen wollte. - Le chat est parti du canapé quand je voulais l'appeler.",
            "Letzten Sommer ist er für immer aus der Stadt weggegangen. - L'été dernier, il est parti de la ville pour toujours.",
            "Wäre er nicht weggegangen, hätten wir noch reden können. - S'il n'était pas parti, nous aurions pu encore parler.",
            "Es ist schade, dass so viele Leute von der Veranstaltung weggegangen sind. - C'est dommage que tant de gens soient partis de l'événement.",
            "Sie ist vom Schreibtisch weggegangen, um Kaffee zu holen. - Elle est partie de son bureau pour chercher du café.",
            "Er ist weggegangen und nie wieder zurückgekehrt. - Il est parti et n'est jamais revenu.",
            "Nach dem Streit ist sie sofort weggegangen. - Après la dispute, elle est partie immédiatement.",
            "Man hat bemerkt, dass er schon vor Stunden weggegangen war. - On a remarqué qu'il était déjà parti il y a des heures."
        ],
        "context_sentence": "Und ohne Deutschkenntnisse ist es noch schwerer!",
        "created_at": "2026-03-23T15:44:29.195Z",
        "definition": "Forme du participe passé du verbe 'weggehen' (partir, s'en aller). Indique l'action de quitter un lieu ou une situation.",
        "examples": [
            "Er ist gestern weggegangen. - Il est parti hier.",
            "Sie sind schon weggegangen, als ich ankam. - Ils étaient déjà partis quand je suis arrivé.",
            "Nach dem Streit ist sie einfach weggegangen. - Après la dispute, elle est simplement partie."
        ],
        "id": "word_1774280669195_42qq6ld60",
        "language": "de",
        "mastery_level": 0,
        "part_of_speech": "participe passé",
        "pronunciation": "/vɛkɡəˈɡaŋən/",
        "review_count": 0,
        "translation": "parti, s'en est allé",
        "updated_at": "2026-03-23T15:44:29.204Z",
        "video_id": "Lg5P2w_Ro1c",
        "video_title": "Deutsch lernen (A2): Ganzer Film auf Deutsch - \"Nicos Weg\" | Deutsch lernen mit Videos | Untertitel",
        "word": "weggegangen"
    },
    {
        "aiExamples": [
            "Das Wetter ist heute so schön. - Le temps est si beau aujourd'hui.",
            "Er spricht nicht so schnell wie sein Lehrer. - Il ne parle pas aussi vite que son professeur.",
            "Ich hatte Hunger, so ging ich in die Küche. - J'avais faim, alors je suis allé à la cuisine.",
            "So, jetzt können wir mit der Arbeit beginnen. - Alors, maintenant nous pouvons commencer le travail.",
            "Warum musst du immer so viel reden? - Pourquoi dois-tu toujours parler autant ?",
            "Das Konzert beginnt so gegen acht Uhr. - Le concert commence vers huit heures.",
            "Mach es genau so, wie ich es dir gezeigt habe. - Fais-le exactement comme je te l'ai montré.",
            "Sie ist so mutig wie ein Löwe. - Elle est aussi courageuse qu'un lion.",
            "Ach so, jetzt verstehe ich! - Ah oui, maintenant je comprends !",
            "Er war so müde, dass er sofort einschlief. - Il était si fatigué qu'il s'est endormi immédiatement.",
            "Ich habe so etwas noch nie erlebt. - Je n'ai jamais vécu quelque chose de pareil.",
            "Ist das wirklich so wichtig? - Est-ce vraiment si important ?",
            "Ja, so ist das Leben manchmal. - Oui, c'est comme ça la vie parfois.",
            "Die Liebe kann so kompliziert sein. - L'amour peut être si compliqué.",
            "Mal so, mal so, das hängt von der Situation ab. - Tantôt comme ci, tantôt comme ça, cela dépend de la situation."
        ],
        "context_sentence": "Es ist wichtig, dass man Hilfe hat in so einer Situation.",
        "created_at": "2026-03-23T15:36:02.952Z",
        "definition": "Utilisé pour indiquer une qualité ou une quantité à un certain degré, souvent traduisible par 'tel(le)' ou 'si'. Dans le contexte de la phrase donnée, il signifie 'd'une telle nature' ou 'de cette sorte'.",
        "examples": [
            "Ich habe noch nie so ein Problem gehabt. - Je n'ai jamais eu un tel problème.",
            "Sie ist so müde. - Elle est si fatiguée.",
            "Mach es so, wie ich es dir gezeigt habe. - Fais-le comme je te l'ai montré."
        ],
        "id": "word_1774280162952_2ca5zdldl",
        "language": "de",
        "mastery_level": 0,
        "part_of_speech": "adverbe",
        "pronunciation": "/zoː/",
        "review_count": 0,
        "translation": "tel(le), si, ainsi",
        "updated_at": "2026-03-23T15:36:02.957Z",
        "video_id": "Lg5P2w_Ro1c",
        "video_title": "Deutsch lernen (A2): Ganzer Film auf Deutsch - \"Nicos Weg\" | Deutsch lernen mit Videos | Untertitel",
        "word": "so"
    },
    {
        "aiExamples": [
            "Ich studiere Betriebswirtschaft an der Universität. - J'étudie la gestion d'entreprise à l'université.",
            "Ein Abschluss in Betriebswirtschaft eröffnet viele Karrierewege. - Un diplôme en gestion d'entreprise ouvre de nombreuses voies de carrière.",
            "Für eine Führungsposition sind fundierte Kenntnisse der Betriebswirtschaft unerlässlich. - Pour un poste de direction, de solides connaissances en gestion d'entreprise sont indispensables.",
            "Die Prinzipien der Betriebswirtschaft helfen Unternehmen, effizienter zu arbeiten. - Les principes de la gestion d'entreprise aident les entreprises à travailler plus efficacement.",
            "Im Gegensatz zur Volkswirtschaftslehre konzentriert sich die Betriebswirtschaft auf einzelne Unternehmen. - Contrairement à l'économie politique, la gestion d'entreprise se concentre sur les entreprises individuelles.",
            "Marketing ist ein wichtiger Bereich der modernen Betriebswirtschaft. - Le marketing est un domaine important de la gestion d'entreprise moderne.",
            "Sie hat sich entschieden, Betriebswirtschaft zu studieren, um ihr eigenes Unternehmen zu gründen. - Elle a décidé d'étudier la gestion d'entreprise pour créer sa propre entreprise.",
            "Die Digitalisierung verändert die Landschaft der Betriebswirtschaft grundlegend. - La digitalisation modifie fondamentalement le paysage de la gestion d'entreprise.",
            "Er wendet die Konzepte der Betriebswirtschaft erfolgreich in seinem Startup an. - Il applique avec succès les concepts de la gestion d'entreprise dans sa startup.",
            "Eine solide Betriebswirtschaft ist der Schlüssel zum langfristigen Erfolg eines Unternehmens. - Une gestion d'entreprise solide est la clé du succès à long terme d'une entreprise.",
            "Der Lehrstuhl für Betriebswirtschaft bietet spezialisierte Kurse in Finanzmanagement an. - La chaire de gestion d'entreprise propose des cours spécialisés en gestion financière.",
            "Meine vorherige Erfahrung in der Betriebswirtschaft hat mir geholfen, dieses Projekt zu leiten. - Mon expérience antérieure en gestion d'entreprise m'a aidé à diriger ce projet.",
            "Die Zukunft der Betriebswirtschaft liegt in der datengesteuerten Entscheidungsfindung. - L'avenir de la gestion d'entreprise réside dans la prise de décision basée sur les données.",
            "Viele Studierende finden die Vorlesungen zur Betriebswirtschaft anspruchsvoll, aber lohnend. - De nombreux étudiants trouvent les cours de gestion d'entreprise exigeants mais gratifiants.",
            "Für diese Position ist ein Master-Abschluss in Betriebswirtschaft von Vorteil. - Pour ce poste, un master en gestion d'entreprise est un atout."
        ],
        "context_sentence": ". Sie studiert Betriebswirtschaft an der Ludwig-Maximillians-Universität in München. (from: German Reading: Martin, Leonie und Christian)",
        "created_at": "2026-03-23T01:15:49.935Z",
        "definition": "Branche de l'économie qui s'occupe de la gestion et de l'organisation des entreprises, de leurs processus internes et de leurs relations avec le marché. C'est l'étude des principes et des pratiques de la gestion des affaires.",
        "examples": [
            "Sie hat einen Master in Betriebswirtschaft erworben. - Elle a obtenu un master en économie d'entreprise.",
            "Das Studium der Betriebswirtschaft ist sehr gefragt. - Les études d'économie d'entreprise sont très demandées.",
            "Er arbeitet in der Abteilung für Betriebswirtschaft. - Il travaille au département de gestion d'entreprise."
        ],
        "id": "word_1774228549935_eyvd66mj2",
        "language": "de",
        "mastery_level": 0,
        "part_of_speech": "noun",
        "pronunciation": "/bəˈtriːpsˌvɪʁtʃaft/",
        "review_count": 0,
        "translation": "économie d'entreprise, gestion d'entreprise",
        "updated_at": "2026-03-23T01:15:49.941Z",
        "word": "Betriebswirtschaft"
    },
    {
        "aiExamples": [
            "Wir haben noch viel zu tun. - Nous avons encore beaucoup à faire.",
            "Der Bus ist noch nicht gekommen. - Le bus n'est pas encore arrivé.",
            "Könnten Sie mir bitte noch ein Glas Wasser bringen? - Pourriez-vous m'apporter encore un verre d'eau, s'il vous plaît ?",
            "Das neue Modell ist noch schneller als das alte. - Le nouveau modèle est encore plus rapide que l'ancien.",
            "Es ist noch sehr früh, die Geschäfte sind geschlossen. - Il est encore très tôt, les magasins sont fermés.",
            "Ich habe ihn noch nie gesehen. - Je ne l'ai encore jamais vu.",
            "Wie lange dauert es noch bis zur Pause? - Combien de temps reste-t-il jusqu'à la pause ?",
            "Er hat mir noch dafür gedankt, obwohl ich ihm nur geholfen habe. - Il m'a encore remercié pour cela, bien que je l'aie seulement aidé.",
            "Ist der Kaffee noch warm? - Le café est-il encore chaud ?",
            "Wir haben nur noch wenige Kekse übrig. - Il ne nous reste plus que quelques biscuits.",
            "Möchtest du noch bleiben oder gehen wir? - Veux-tu encore rester ou partons-nous ?",
            "Es kommt noch ein Freund von mir. - Un autre de mes amis arrive.",
            "Das war noch spannender als der Film gestern. - C'était encore plus passionnant que le film d'hier.",
            "Wir können das Projekt noch retten, wenn wir uns beeilen. - Nous pouvons encore sauver le projet si nous nous dépêchons.",
            "Hast du deine Hausaufgaben noch nicht gemacht? - Tu n'as pas encore fait tes devoirs ?"
        ],
        "context_sentence": "– Es gibt noch ein Musical oder wir können ins Theater gehen.",
        "created_at": "2026-03-22T16:58:14.000Z",
        "definition": "Indique la persistance d'un état, d'une action, ou l'ajout d'une quantité. Peut signifier 'encore', 'toujours', 'de plus'.",
        "examples": [
            "Ich habe noch viel zu tun. - J'ai encore beaucoup à faire.",
            "Willst du noch einen Kaffee? - Veux-tu encore un café ?",
            "Es ist noch früh. - Il est encore tôt."
        ],
        "id": "word_1774198694000_32jskudba",
        "language": "de",
        "mastery_level": 0,
        "part_of_speech": "adverb",
        "pronunciation": "/nɔx/",
        "review_count": 0,
        "translation": "encore",
        "updated_at": "2026-03-22T16:58:15.229Z",
        "video_id": "Lg5P2w_Ro1c",
        "video_title": "Deutsch lernen (A2): Ganzer Film auf Deutsch - \"Nicos Weg\" | Deutsch lernen mit Videos | Untertitel",
        "word": "noch"
    },
    {
        "aiExamples": [
            "Das klingt gut! - Ça sonne bien !",
            "Klingt interessant. - Ça a l'air intéressant.",
            "Wie klingt das für dich? - Comment cela te semble-t-il ?",
            "Das klingt nach einem Plan. - Ça ressemble à un plan.",
            "Die Glocke klingt klar und hell. - La cloche sonne clair et lumineux.",
            "Wenn das stimmt, klingt das nach einer echten Herausforderung. - Si c'est vrai, cela ressemble à un véritable défi.",
            "Seine Stimme klingt heute etwas müde. - Sa voix sonne un peu fatiguée aujourd'hui.",
            "Klingt vernünftig, lass es uns versuchen. - Cela semble raisonnable, essayons.",
            "Klingt, als ob du eine tolle Zeit hattest. - On dirait que tu as passé un bon moment.",
            "Ihre Entschuldigung klingt leider nicht sehr aufrichtig. - Malheureusement, son excuse ne semble pas très sincère.",
            "Die Idee klingt auf dem Papier gut, aber die Umsetzung könnte schwierig sein. - L'idée semble bonne sur le papier, mais la mise en œuvre pourrait être difficile.",
            "Seine Worte klingen mir immer noch in den Ohren. - Ses mots résonnent encore dans mes oreilles.",
            "Es klingt unwahrscheinlich, dass er das alleine geschafft hat. - Il semble improbable qu'il ait réussi cela seul.",
            "Das Angebot klingt verlockend, ich muss darüber nachdenken. - L'offre semble tentante, je dois y réfléchir.",
            "Sein Deutsch klingt mit einem leichten französischen Akzent. - Son allemand sonne avec un léger accent français."
        ],
        "context_sentence": "",
        "created_at": "2026-03-22T16:49:36.440Z",
        "definition": "Forme conjuguée du verbe 'klingen' (sonner). Il signifie 'produire un son' ou, de manière idiomatique, 'sembler' ou 'avoir l'air' (donner une certaine impression auditive ou générale).",
        "examples": [
            "Das klingt gut. - Cela sonne bien.",
            "Wie klingt das für dich? - Comment cela sonne-t-il pour toi ?",
            "Es klingt nach einer guten Idee. - Cela sonne comme une bonne idée."
        ],
        "id": "word_1774198176440_3nd74via9",
        "language": "de",
        "mastery_level": 0,
        "part_of_speech": "verbe (forme conjuguée)",
        "pronunciation": "/klɪŋt/",
        "review_count": 0,
        "translation": "sonne",
        "updated_at": "2026-03-22T16:49:54.157Z",
        "video_id": "Lg5P2w_Ro1c",
        "video_title": "Deutsch lernen (A2): Ganzer Film auf Deutsch - \"Nicos Weg\" | Deutsch lernen mit Videos | Untertitel",
        "word": "Klingt"
    },
    {
        "aiExamples": [
            "Schade! Ich hätte dich gerne getroffen.",
            "Dommage ! J'aurais aimé te rencontrer.",
            "Es ist schade, dass du nicht kommen kannst.",
            "C'est dommage que tu ne puisses pas venir.",
            "Das ist wirklich schade, denn die Party war toll.",
            "C'est vraiment dommage, car la fête était super.",
            "Wie schade, dass wir den Zug verpasst haben!",
            "Quel dommage que nous ayons raté le train !",
            "Schade um die schönen Blumen, sie sind erfroren.",
            "Quel dommage pour les jolies fleurs, elles ont gelé.",
            "Es ist schade um all die Mühe, die du dir gemacht hast.",
            "C'est dommage pour tous les efforts que tu as faits.",
            "Es wäre schade, wenn das Projekt scheitern würde.",
            "Ce serait dommage si le projet échouait.",
            "Schade, dass das Konzert abgesagt wurde.",
            "Dommage que le concert ait été annulé.",
            "\"Kommst du mit?\" - \"Leider nicht, schade.\"",
            "\"Tu viens avec nous ?\" - \"Malheureusement non, dommage.\"",
            "Es ist ein bisschen schade, dass wir nicht mehr Zeit hatten.",
            "C'est un peu dommage que nous n'ayons pas eu plus de temps.",
            "Schade, dass wir diese Gelegenheit nicht genutzt haben.",
            "Dommage que nous n'ayons pas saisi cette occasion.",
            "Es ist schade, gutes Essen wegzuwerfen.",
            "C'est dommage de jeter de la bonne nourriture.",
            "Angesichts der Situation ist es schade, dass die Kommunikation so schlecht war.",
            "Compte tenu de la situation, il est dommage que la communication ait été si mauvaise.",
            "Schade, dass er sein Talent nicht weiter verfolgt hat.",
            "Dommage qu'il n'ait pas poursuivi son talent.",
            "Es ist schade, wie wenig Wert heute noch auf Handwerk gelegt wird.",
            "C'est dommage de voir la faible valeur accordée aujourd'hui à l'artisanat."
        ],
        "context_sentence": "– Es gibt noch ein Musical oder wir können ins Theater gehen.",
        "created_at": "2026-03-22T15:52:49.415Z",
        "definition": "Expression de regret, de déception ; dommage, pitié.",
        "examples": [
            "Schade, dass du nicht kommen kannst. - Dommage que tu ne puisses pas venir.",
            "Es ist schade um die Mühe. - C'est dommage pour l'effort.",
            "Schade! Ich habe meinen Zug verpasst. - Dommage ! J'ai raté mon train."
        ],
        "id": "word_1774194769415_24u8vk28i",
        "language": "de",
        "mastery_level": 0,
        "part_of_speech": "interjection",
        "pronunciation": "/ˈʃaːdə/",
        "review_count": 0,
        "translation": "Dommage",
        "updated_at": "2026-03-23T15:51:32.727Z",
        "video_id": "Lg5P2w_Ro1c",
        "video_title": "Deutsch lernen (A2): Ganzer Film auf Deutsch - \"Nicos Weg\" | Deutsch lernen mit Videos | Untertitel",
        "word": "Schade"
    },
    {
        "aiExamples": [
            "Du hast das bestimmt schon mal gehört. - Tu as sûrement déjà entendu ça.",
            "Das Wetter wird morgen bestimmt besser sein. - Le temps sera certainement meilleur demain.",
            "Sie hat bestimmt einen guten Grund dafür. - Elle a sûrement une bonne raison pour cela.",
            "Wenn du fleißig übst, wirst du die Prüfung bestimmt bestehen. - Si tu t'exerces assidûment, tu réussiras certainement l'examen.",
            "Die Kinder haben sich bestimmt über die Geschenke gefreut. - Les enfants se sont certainement réjouis des cadeaux.",
            "An einem bestimmten Tag treffen wir uns wieder. - Nous nous retrouverons un jour précis.",
            "Gibt es einen bestimmten Grund, warum du so spät bist? - Y a-t-il une raison particulière pour laquelle tu es si en retard ?",
            "Ich habe eine bestimmte Vorstellung davon, wie es aussehen soll. - J'ai une idée précise de comment cela devrait ressembler.",
            "Für diesen Zweck gibt es eine bestimmte Software. - Il existe un logiciel spécifique à cet effet.",
            "Er sprach von einer bestimmten Herausforderung, die er meistern wollte. - Il parlait d'un défi particulier qu'il voulait relever.",
            "Dieses Buch ist für Anfänger bestimmt. - Ce livre est destiné aux débutants.",
            "Die Spende ist für einen guten Zweck bestimmt. - Le don est destiné à une bonne cause.",
            "Dieser Platz ist für Rollstuhlfahrer bestimmt. - Cette place est réservée aux personnes en fauteuil roulant.",
            "Sie trat mit einer sehr bestimmten Haltung auf. - Elle s'est présentée avec une attitude très déterminée.",
            "Er gab eine sehr bestimmte Antwort, die keine Zweifel zuließ. - Il a donné une réponse très ferme qui ne laissait aucune place au doute."
        ],
        "context_sentence": "– Es gibt noch ein Musical oder wir können ins Theater gehen.",
        "created_at": "2026-03-22T15:47:31.701Z",
        "definition": "Certain, défini, précis (adjectif); certainement, sûrement (adverbe).",
        "examples": [
            "Das ist bestimmt so. - C'est certainement comme ça.",
            "Wir haben ein bestimmtes Ziel. - Nous avons un objectif précis."
        ],
        "id": "word_1774194451700_rrvg3gqia",
        "language": "de",
        "mastery_level": 0,
        "part_of_speech": "adverb / adjective",
        "pronunciation": "/bəˈʃtɪmt/",
        "review_count": 0,
        "translation": "certainement",
        "updated_at": "2026-03-22T16:59:28.867Z",
        "video_id": "Lg5P2w_Ro1c",
        "video_title": "Deutsch lernen (A2): Ganzer Film auf Deutsch - \"Nicos Weg\" | Deutsch lernen mit Videos | Untertitel",
        "word": "bestimmt"
    },
    {
        "context_sentence": "Mehr 'ne Krimikomödie.",
        "created_at": "2026-03-22T15:45:53.606Z",
        "id": "word_1774194353606_76qxoalxf",
        "language": "de",
        "mastery_level": 0,
        "review_count": 0,
        "translation": "comédie policière",
        "updated_at": "2026-03-22T15:45:53.607Z",
        "video_id": "Lg5P2w_Ro1c",
        "video_title": "Deutsch lernen (A2): Ganzer Film auf Deutsch - \"Nicos Weg\" | Deutsch lernen mit Videos | Untertitel",
        "word": "Krimikomödie"
    },
    {
        "context_sentence": "In dem Buche hieß es: »Die Boas verschlingen ihre Beute als Ganzes, (from: Der Kleine Prinz)",
        "created_at": "2026-03-22T11:38:23.176Z",
        "id": "word_1774179503175_1cencc7du",
        "language": "de",
        "mastery_level": 0,
        "review_count": 0,
        "translation": "devour, swallow, engulf",
        "updated_at": "2026-03-22T11:38:23.176Z",
        "word": "verschlingen"
    },
    {
        "aiExamples": [
            "Verzeihung, das war keine Absicht. - Pardon, ce n'était pas intentionnel.",
            "Verzeihung, könnten Sie das bitte wiederholen? - Pardon, pourriez-vous répéter cela, s'il vous plaît ?",
            "Verzeihung, wenn ich Sie kurz unterbreche, aber ich habe eine Frage. - Pardon de vous interrompre un instant, mais j'ai une question.",
            "Verzeihung, wissen Sie vielleicht, wo der Bahnhof ist? - Excusez-moi, savez-vous peut-être où se trouve la gare ?",
            "Ich bitte um Verzeihung für meinen Fehler. - Je vous demande pardon pour mon erreur.",
            "Verzeihung für die entstandenen Unannehmlichkeiten. - Pardon pour les désagréments occasionnés.",
            "Verzeihung, könnten Sie mir bitte den Weg zum Ausgang zeigen? - Excusez-moi, pourriez-vous me montrer le chemin vers la sortie, s'il vous plaît ?",
            "Verzeihung, darf ich mal durch? - Pardon, puis-je passer ?",
            "Verzeihung, aber ich glaube, Sie verwechseln da etwas. - Pardon, mais je crois que vous confondez quelque chose.",
            "Verzeihung, habe ich das richtig verstanden? - Pardon, ai-je bien compris ?",
            "Verzeihung, ich meinte natürlich den anderen Bericht. - Pardon, je voulais bien sûr dire l'autre rapport.",
            "Er bat sie aufrichtig um Verzeihung für sein unüberlegtes Verhalten. - Il lui demanda sincèrement pardon pour son comportement inconsidéré.",
            "Es ist schwer, um Verzeihung zu bitten, wenn man sich im Recht fühlt. - Il est difficile de demander pardon quand on se sent dans son droit.",
            "Falls ich Sie mit meiner Bemerkung gekränkt haben sollte, bitte ich aufrichtig um Verzeihung. - Si ma remarque devait vous avoir offensé, je vous demande sincèrement pardon.",
            "Verzeihung, könnte mir jemand sagen, wie spät es ist? - Excusez-moi, quelqu'un pourrait-il me dire l'heure qu'il est ?"
        ],
        "context_sentence": "Ich bitte die Kinder um Verzeihung, daß ich die- (from: )",
        "created_at": "2026-03-21T23:54:18.895Z",
        "id": "word_1774137258895_whbgh0qra",
        "language": "es",
        "mastery_level": 0,
        "review_count": 0,
        "translation": "forgiveness, pardon, excuse",
        "updated_at": "2026-03-23T14:29:26.659Z",
        "word": "Verzeihung"
    },
    {
        "context_sentence": "– Ja. Ich finde, die meisten Frauen machen irgendwie alles komplizierter, als es ist.",
        "created_at": "2026-03-15T16:16:15.858Z",
        "id": "word_1773591375857_mat1pfe4q",
        "language": "de",
        "mastery_level": 0,
        "review_count": 0,
        "translation": "d'une manière ou d'une autre, en quelque sorte, un peu",
        "updated_at": "2026-03-15T16:16:15.858Z",
        "video_id": "LkufozluseI",
        "video_title": "Deutsch lernen (B1): Ganzer Film auf Deutsch - \"Nicos Weg\" | Deutsch lernen mit Videos | Untertitel",
        "word": "irgendwie"
    },
    {
        "aiExamples": [
            "Ich habe den ersten Entwurf des Berichts fertiggestellt. - J'ai terminé la première ébauche du rapport.",
            "Der Architekt präsentierte einen mutigen Entwurf für das neue Gebäude. - L'architecte a présenté un design audacieux pour le nouveau bâtiment.",
            "Der Gesetzesentwurf wurde im Parlament heftig diskutiert. - Le projet de loi a été vivement débattu au parlement.",
            "Sie zeigte mir einen groben Entwurf ihrer neuen Skulptur. - Elle m'a montré une esquisse grossière de sa nouvelle sculpture.",
            "Wir müssen den Entwurf des Projektplans bis Freitag einreichen. - Nous devons soumettre l'ébauche du plan de projet avant vendredi.",
            "Der Entwurf der neuen Webseite sieht sehr modern aus. - Le design du nouveau site web a l'air très moderne.",
            "Bitte überarbeiten Sie diesen Entwurf und fügen Sie weitere Details hinzu. - Veuillez réviser cette ébauche et ajouter plus de détails.",
            "Wir haben drei verschiedene Entwürfe für das Logo zur Auswahl. - Nous avons trois designs différents pour le logo à choisir.",
            "Ich muss noch einen Entwurf für meine Präsentation machen. - Je dois encore faire une ébauche pour ma présentation.",
            "Der Entwurf erhielt viel positives Feedback, aber auch einige Verbesserungsvorschläge. - L'ébauche a reçu beaucoup de commentaires positifs, mais aussi quelques suggestions d'amélioration.",
            "Manchmal fühlt sich das Leben wie ein unvollendeter Entwurf an. - Parfois, la vie ressemble à une ébauche inachevée.",
            "Der Entwurf des Vertrags wird in den nächsten Tagen zur Prüfung verschickt. - Le projet de contrat sera envoyé pour examen dans les prochains jours.",
            "Meine Professorin bat mich, ihr den Entwurf meiner Masterarbeit zu schicken. - Ma professeure m'a demandé de lui envoyer l'ébauche de mon mémoire de master.",
            "Nach sorgfältiger Prüfung des Entwurfs haben wir uns für diese Variante entschieden. - Après un examen attentif du projet, nous avons opté pour cette variante.",
            "Er stellte einen kühnen Entwurf für die zukünftige Stadtentwicklung vor. - Il a présenté un plan audacieux pour le développement urbain futur."
        ],
        "context_sentence": "Ist nur 'n erster Entwurf, aber ... schau einfach mal rein.",
        "created_at": "2026-03-15T16:09:50.529Z",
        "id": "word_1773590990529_3zoliplu6",
        "language": "de",
        "mastery_level": 0,
        "review_count": 0,
        "translation": "projet, brouillon, ébauche, esquisse, plan",
        "updated_at": "2026-03-23T14:31:56.233Z",
        "video_id": "LkufozluseI",
        "video_title": "Deutsch lernen (B1): Ganzer Film auf Deutsch - \"Nicos Weg\" | Deutsch lernen mit Videos | Untertitel",
        "word": "Entwurf"
    }
];

async function importVocabulary() {
  try {
    console.log('[Import] Initializing Supabase client...');
    const supabase = await createSupabaseClient();
    console.log('[Import] Supabase client initialized');

    console.log(`[Import] Inserting ${vocabularyData.length} vocabulary items...`);

    // Batch insert in chunks to avoid timeout
    const chunkSize = 10;
    let totalInserted = 0;

    for (let i = 0; i < vocabularyData.length; i += chunkSize) {
      const chunk = vocabularyData.slice(i, i + chunkSize);

      const { data, error } = await supabase
        .from('vocabulary')
        .upsert(chunk, { onConflict: 'id' })
        .select();

      if (error) {
        console.error(`[Import] Error inserting chunk ${Math.floor(i / chunkSize) + 1}:`, error);
      } else {
        totalInserted += data.length;
        console.log(`[Import] ✓ Inserted ${data.length} items (total: ${totalInserted})`);
      }
    }

    console.log(`[Import] ✓ Successfully imported ${totalInserted} vocabulary items!`);
    process.exit(0);
  } catch (error) {
    console.error('[Import] Failed to import vocabulary:', error);
    process.exit(1);
  }
}

// Run import
importVocabulary();
