/*******************************************************************************
 * Arquivo no qual manipulamos as funções dos arquivos APIWrapper.js e SCOFunctions.js,
 * adicionando nossa funcionalidade
 *
 * Editado por: Kelivn Costa - 17/02/2025
 * Contato: okelvincosta@gmail.com
 *
 * Criado originalmente: Péricles Christian
 *******************************************************************************/

import * as APIWrapper from "./APIWrapper.js";
import * as SCOFunctions from "./SCOFunctions.js";

// Variáveis de controle
const DEV = false; // Para DESENVOLVIMENTO apenas, para não ficar dando alert caso não encontre a API. Se for true, não vai chamar a API
const DEBUG = true; // Para mostrar mensagens de debug no console que eu personalizei e coloquei em lugares estratégicos desse arquivo

// Pega API do SCORM
export var scormAPI = !DEV ? APIWrapper.getAPIHandle() : null;

export const LESSON_STATUS = {
  notAttempted: "not attempted",
  incomplete: "incomplete",
  completed: "completed",
  passed: "passed",
  failed: "failed",
};

export const FIELDS = {
  lessonLocation: "cmi.core.lesson_location",
  lessonStatus: "cmi.core.lesson_status",
  suspendData: "cmi.suspend_data",
  studentName: "cmi.core.student_name",
  scoreRaw: "cmi.core.score.raw",
};

export var studentName;
export var suspendData;
export var studentScore;
export var topicIsFinished;

/*******************************************************************************
 *
 * TREATMENT ---------------------------------------------------------------------------
 *
 *******************************************************************************/

/*******************************************************************************
 * Inicializa o evento de carregamento da janela. Se o scormAPI existir, ele registra o API e carrega a página.
 * Em seguida, define um intervalo para verificar se o LMS está inicializado e, se estiver, inicializa a visualização.
 * Por fim, registra um ouvinte de eventos para o clique no elemento "finishButton", que chama a função saveSuspendData.
 *
 * @return {void}
 *******************************************************************************/
window.onload = function () {
  // Se a API existir carregará a página
  if (scormAPI) {
    // Puxa do SCOFunctions.js
    // Lá dentro inicia a API e trata os erros
    // Por fim, carrega a página

    // // Executa a função loadPage que vai iniciar a comunicação com LMS através da API
    SCOFunctions.loadPage();

    /**
     * Uma vez que a comunicação é iniciada em loadPage(),
     * queremos verificar periodicamente se ela ainda está em andamento.
     *
     * O método setInterval vai verificar periodicamente se o LMS está iniciado através da função.
     * Ou se o LMS não estiver iniciado, o intervalo irá verificar novamente.
     * Estando iniciado, o intervalo não irá mais verificar.
     */
    var interval = setInterval(function () {
      if (APIWrapper.LMSIsInitialized()) {
        clearInterval(interval);
        initView();
        meuDebug();
      }
    });
  }
};

/*******************************************************************************
 * Configura um ouvinte de evento de janela para o evento `beforeunload`.
 * Esta função verifica se a `scormAPI` está disponível e chama a função `unloadPage`.
 *
 * @return {void} Esta função não retorna um valor.
 *******************************************************************************/
window.onbeforeunload = function () {
  if (scormAPI) SCOFunctions.unloadPage();
};

/*******************************************************************************
 *
 * FUNCTIONS ---------------------------------------------------------------------------
 *
 *******************************************************************************/

/*******************************************************************************
 * Inicializa a visualização ao recuperar os dados do aluno.
 * Verifica se o tópico foi concluído.
 * Atualizar o elemento do nome do aluno no documento.
 *
 * @return {void} Esta função não retorna um valor.
 *******************************************************************************/
function initView() {
  studentName = getScormData(FIELDS.studentName);

  if (getScormData(FIELDS.lessonStatus) == LESSON_STATUS.completed) {
    topicIsFinished = LESSON_STATUS.completed;
  }
  // Essa linha está recuperando o valor do campo "cmi.suspend_data" do SCORM API e armazenando-o na variável
  suspendData = getScormData(FIELDS.suspendData);

  if (document.getElementById("studentName")) {
    document.getElementById("studentName").innerHTML = studentName;
  }

  finishButton();
}

/*******************************************************************************
 * Recupera dados do SCORM API, se disponível.
 *
 * @param {string} field - O campo a partir do qual recuperar os dados.
 * @return {string|undefined} O valor do campo do SCORM API, ou indefinido se o SCORM API não estiver disponível.
 *******************************************************************************/
function getScormData(field) {
  if (scormAPI) {
    return APIWrapper.doLMSGetValue(field);
  }
}

/*******************************************************************************
 * Define os dados do SCORM para um determinado campo, se a API do SCORM estiver disponível.
 *
 * @param {string} field - O campo para o qual definir os dados.
 * @param {any} value - O valor a ser definido para o campo.
 * @param {boolean} commit - Se deve fazer o commit das alterações imediatamente.
 * @return {void} Esta função não retorna um valor.
 *******************************************************************************/
function setScormData(field, value, commit) {
  if (scormAPI) {
    APIWrapper.doLMSSetValue(field, value);

    if (commit) {
      APIWrapper.doLMSCommit("");
    }
  }
}

/*******************************************************************************
 * útil quando você precisa armazenar informações temporárias ou dados que não são críticos para o progresso do curso,
 * mas que devem ser salvos em caso de interrupção da sessão.
 *
 * @param {any} value - campo livre para armazenar qualquer informação que desejar
 * @return {void} Esta função não retorna um valor.
 *******************************************************************************/
function saveSuspendData(value) {
  // campo livre para armazenar qualquer informação que desejar
  setScormData(FIELDS.suspendData, value, true);
}

/**
 * Registra os eventos de clique para finalizar o curso.
 * Desabilita o botão de finalizar se o tópico já estiver concluído e
 * adiciona um ouvinte de evento a ele para salvar os dados de suspensão, finalizar o tópico,
 * redefine a animação do botão e adiciona a animação ao botão.
 */
function finishButton() {
  // Registra os eventos de clique para concluir o curso
  let buttonFinish = document.getElementById("finishButton");

  if (topicIsFinished == LESSON_STATUS.completed) {
    buttonFinish.disabled = true;
    buttonFinish.classList.add("disabled");
    buttonFinish.innerHTML =
      'Concluído <span class="ml-1 pb-1 material-symbols-rounded"> check </span>';
  }

  if (buttonFinish) {
    buttonFinish.addEventListener("click", (e) => {
      console.log("btn clicked");

      saveSuspendData(suspendData);
      finishTopic();

      //reset animation buble-button
      e.target.classList.remove("animate");

      e.target.classList.add("animate");
      setTimeout(function () {
        e.target.classList.remove("animate");
      }, 700);
    });
  }
}

/*******************************************************************************
 * Finaliza o tópico atual caso ainda não tenha sido concluído,
 * define os dados SCORM e redireciona o usuário para a página
 * Relatório de Desempenho se a API SCORM estiver disponível.
 *
 * @return {void} This function does not return a value.
 *******************************************************************************/
export function finishTopic() {
  console.log("função finishTopic");
  // Se o curso ainda não foi concluído, salva o status do curso e conclui o tópico
  if (topicIsFinished != LESSON_STATUS.completed) {
    setScormData(FIELDS.lessonStatus, LESSON_STATUS.completed, true);

    console.log("getScormData(FIELDS.lessonStatus):");
    console.log(getScormData(FIELDS.lessonStatus));

    // evitar que a função finishTopic tente finalizar o tópico novamente em chamadas subsequentes.
    topicIsFinished = "completed";
    console.log("Tópico finalizado == btn pressed");

    meuDebug();
    // Direciona o usuário para a página de Relatório de Desempenho
    if (scormAPI) {
      SCOFunctions.unloadPage();
    }
  }
}

/**
 * Para debugar os campos principais
 *
 * @return {void} This function does not return a value.
 */
function meuDebug() {
  if (DEBUG) {
    console.log("--------INÍCIO DEBUG----------");

    console.log("suspendData:", suspendData);
    console.log(
      "getScormData(FIELDS.lessonStatus):",
      getScormData(FIELDS.lessonStatus)
    );
    console.log(
      "getScormData(cmi.core.student_id):",
      getScormData("cmi.core.student_id")
    );
    console.log(
      "getScormData(cmi.core.student_name):",
      getScormData("cmi.core.student_name")
    );
    console.log(
      "getScormData(cmi.core.lesson_mode):",
      getScormData("cmi.core.lesson_mode")
    );
    console.log(
      "getScormData(cmi.suspend_data):",
      getScormData("cmi.suspend_data")
    );
    console.log(
      "getScormData(cmi.launch_data):",
      getScormData("cmi.launch_data")
    );

    console.log("--------FIM DEBUG----------");
  }
}
